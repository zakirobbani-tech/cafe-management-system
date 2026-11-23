ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at timestamptz NOT NULL DEFAULT now();
CREATE SEQUENCE IF NOT EXISTS invoice_seq;

-- Penjualan atomik: harga dari tabel menus (bukan dari klien), stok dikunci & divalidasi, idempotent.
CREATE OR REPLACE FUNCTION public.create_sale(p_key text, p_type text, p_discount bigint, p_items jsonb, p_payments jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_items jsonb; v_sub bigint; v_disc bigint := coalesce(p_discount,0); v_total bigint; v_paid bigint;
        v_id bigint; v_num text; v_bad int; v_tx transactions; s record;
BEGIN
  IF app_role() IS NULL THEN RAISE EXCEPTION 'Tidak berwenang'; END IF;
  IF p_key IS NULL OR length(p_key) < 8 THEN RAISE EXCEPTION 'Idempotency key wajib (min 8 karakter)'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_key));
  SELECT * INTO v_tx FROM transactions WHERE idempotency_key = p_key;
  IF FOUND THEN RETURN jsonb_build_object('id',v_tx.id,'number',v_tx.number,'total',v_tx.total,'duplicate',true); END IF;
  IF p_type NOT IN ('dine_in','take_away','delivery') THEN RAISE EXCEPTION 'Jenis pesanan tidak valid'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Keranjang kosong'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_items) e WHERE coalesce((e->>'qty')::int,0) <= 0 OR (e->>'menu_id') IS NULL) THEN
    RAISE EXCEPTION 'Item tidak valid'; END IF;
  SELECT jsonb_agg(jsonb_build_object('menu_id',menu_id,'qty',q)) INTO v_items
    FROM (SELECT (e->>'menu_id')::bigint AS menu_id, sum((e->>'qty')::int) AS q FROM jsonb_array_elements(p_items) e GROUP BY 1) a;
  SELECT coalesce(sum(m.price*c.qty),0), count(*) FILTER (WHERE m.id IS NULL OR NOT m.available) INTO v_sub, v_bad
    FROM jsonb_to_recordset(v_items) AS c(menu_id bigint, qty int) LEFT JOIN menus m ON m.id = c.menu_id;
  IF v_bad > 0 THEN RAISE EXCEPTION 'Menu tidak ditemukan atau tidak tersedia'; END IF;
  IF v_disc < 0 OR v_disc > v_sub THEN RAISE EXCEPTION 'Diskon tidak valid'; END IF;
  v_total := v_sub - v_disc;
  SELECT coalesce(sum((e->>'amount')::bigint),0) INTO v_paid FROM jsonb_array_elements(p_payments) e;
  IF v_paid < v_total THEN RAISE EXCEPTION 'Pembayaran kurang'; END IF;
  PERFORM 1 FROM ingredients WHERE id IN (SELECT rc.ingredient_id FROM jsonb_to_recordset(v_items) AS c(menu_id bigint, qty int)
           JOIN recipes rc ON rc.menu_id = c.menu_id) ORDER BY id FOR UPDATE;
  FOR s IN SELECT g.name FROM jsonb_to_recordset(v_items) AS c(menu_id bigint, qty int) JOIN recipes rc ON rc.menu_id = c.menu_id
           JOIN ingredients g ON g.id = rc.ingredient_id GROUP BY g.id HAVING g.stock_qty < sum(rc.qty*c.qty) LOOP
    RAISE EXCEPTION 'Stok tidak cukup: %', s.name;
  END LOOP;
  v_num := 'INV-'||to_char(now() AT TIME ZONE 'Asia/Makassar','YYMMDD')||'-'||lpad(nextval('invoice_seq')::text,4,'0');
  INSERT INTO transactions(number,idempotency_key,status,order_type,subtotal,discount,tax,service,total,cashier_id)
    VALUES (v_num,p_key,'paid',p_type,v_sub,v_disc,0,0,v_total,auth.uid()) RETURNING id INTO v_id;
  INSERT INTO transaction_items(transaction_id,menu_id,name,price,qty,cogs)
    SELECT v_id, m.id, m.name, m.price, c.qty,
      c.qty * (SELECT coalesce(round(sum(rc.qty*g.avg_cost_milli)/1000.0),0)::bigint FROM recipes rc JOIN ingredients g ON g.id = rc.ingredient_id WHERE rc.menu_id = m.id)
    FROM jsonb_to_recordset(v_items) AS c(menu_id bigint, qty int) JOIN menus m ON m.id = c.menu_id;
  WITH need AS (SELECT rc.ingredient_id AS id, sum(rc.qty*c.qty) AS q FROM jsonb_to_recordset(v_items) AS c(menu_id bigint, qty int)
                JOIN recipes rc ON rc.menu_id = c.menu_id GROUP BY rc.ingredient_id),
       upd AS (UPDATE ingredients g SET stock_qty = g.stock_qty - need.q FROM need WHERE g.id = need.id RETURNING g.id)
  INSERT INTO stock_movements(ingredient_id,qty_change,reason,ref_type,ref_id,user_id)
    SELECT id, -q, 'sale', 'transaction', v_id, auth.uid() FROM need;
  INSERT INTO payments(transaction_id,method,amount) SELECT v_id, e->>'method', (e->>'amount')::bigint FROM jsonb_array_elements(p_payments) e;
  RETURN jsonb_build_object('id',v_id,'number',v_num,'total',v_total,'change',v_paid - v_total,'duplicate',false);
END $$;

-- Refund penuh: status refunded, stok bahan dikembalikan (kebijakan: dikembalikan), tercatat di activity_log.
CREATE OR REPLACE FUNCTION public.refund_sale(p_tx bigint, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tx transactions;
BEGIN
  IF app_role() NOT IN ('owner','manager') THEN RAISE EXCEPTION 'Tidak berwenang'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN RAISE EXCEPTION 'Alasan refund wajib'; END IF;
  SELECT * INTO v_tx FROM transactions WHERE id = p_tx FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaksi tidak ditemukan'; END IF;
  IF v_tx.status <> 'paid' THEN RAISE EXCEPTION 'Hanya transaksi paid yang bisa direfund'; END IF;
  UPDATE transactions SET status='refunded', refund_amount=total, cancel_reason=p_reason WHERE id = p_tx;
  WITH back AS (SELECT rc.ingredient_id AS id, sum(rc.qty*ti.qty) AS q FROM transaction_items ti JOIN recipes rc ON rc.menu_id = ti.menu_id
                WHERE ti.transaction_id = p_tx GROUP BY rc.ingredient_id),
       upd AS (UPDATE ingredients g SET stock_qty = g.stock_qty + back.q FROM back WHERE g.id = back.id RETURNING g.id)
  INSERT INTO stock_movements(ingredient_id,qty_change,reason,ref_type,ref_id,user_id)
    SELECT id, q, 'refund', 'transaction', p_tx, auth.uid() FROM back;
  INSERT INTO activity_log(user_id,action,entity,entity_id,detail) VALUES (auth.uid(),'refund','transaction',p_tx,jsonb_build_object('reason',p_reason,'amount',v_tx.total));
  RETURN jsonb_build_object('id',p_tx,'status','refunded');
END $$;

REVOKE EXECUTE ON FUNCTION public.create_sale(text,text,bigint,jsonb,jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.refund_sale(bigint,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_sale(text,text,bigint,jsonb,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_sale(bigint,text) TO authenticated;

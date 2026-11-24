-- Kategori menu menjadi tabel (bisa diubah), dan RPC tambah stok dengan moving weighted average.
CREATE TABLE menu_categories (id bigserial PRIMARY KEY, name text UNIQUE NOT NULL, description text, active boolean NOT NULL DEFAULT true);
INSERT INTO menu_categories(name) VALUES ('Black Series'),('Kopi'),('Yakult Series'),('Non-Coffee'),('Coffee'),('Tea'),('Food'),('Snack'),('Dessert'),('Other') ON CONFLICT DO NOTHING;
ALTER TABLE menus DROP CONSTRAINT IF EXISTS menus_category_check;
ALTER TABLE menus ADD CONSTRAINT menus_category_fk FOREIGN KEY (category) REFERENCES menu_categories(name) ON UPDATE CASCADE;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY menu_categories_read ON menu_categories FOR SELECT TO authenticated USING (app_role() IS NOT NULL);
CREATE POLICY menu_categories_mgr ON menu_categories FOR ALL TO authenticated USING (app_role() IN ('owner','manager')) WITH CHECK (app_role() IN ('owner','manager'));
REVOKE ALL ON menu_categories FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON menu_categories TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE menu_categories_id_seq TO authenticated;

CREATE OR REPLACE FUNCTION public.restock_ingredient(p_id bigint, p_qty bigint, p_total_price bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g ingredients; v_in bigint;
BEGIN
  IF app_role() NOT IN ('owner','manager') THEN RAISE EXCEPTION 'Tidak berwenang'; END IF;
  IF p_qty IS NULL OR p_qty <= 0 THEN RAISE EXCEPTION 'Jumlah harus lebih dari 0'; END IF;
  IF p_total_price IS NULL OR p_total_price < 0 THEN RAISE EXCEPTION 'Harga tidak valid'; END IF;
  SELECT * INTO g FROM ingredients WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bahan tidak ditemukan'; END IF;
  v_in := round(p_total_price * 1000.0 / p_qty);
  UPDATE ingredients SET
    avg_cost_milli = CASE WHEN p_total_price = 0 THEN g.avg_cost_milli
      ELSE round((greatest(g.stock_qty,0) * g.avg_cost_milli + p_qty * v_in)::numeric / (greatest(g.stock_qty,0) + p_qty)) END,
    stock_qty = stock_qty + p_qty WHERE id = p_id;
  INSERT INTO stock_movements(ingredient_id,qty_change,reason,ref_type,user_id) VALUES (p_id,p_qty,'purchase','restock',auth.uid());
  INSERT INTO activity_log(user_id,action,entity,entity_id,detail) VALUES (auth.uid(),'restock','ingredient',p_id,jsonb_build_object('qty',p_qty,'total_price',p_total_price));
  RETURN jsonb_build_object('id', p_id, 'stock', g.stock_qty + p_qty);
END $$;
REVOKE EXECUTE ON FUNCTION public.restock_ingredient(bigint,bigint,bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restock_ingredient(bigint,bigint,bigint) TO authenticated;
-- Catatan: pembelian lewat fungsi ini belum membuat baris expenses (modul pengeluaran belum ada). Jangan mencatatnya dua kali nanti.

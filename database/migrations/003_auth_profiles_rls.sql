-- Mengganti tabel users buatan sendiri (BIGINT) dengan profiles yang terhubung ke Supabase Auth (UUID), lalu mengaktifkan RLS.
-- Hanya aman pada database yang belum berisi data operasional.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM transactions) OR EXISTS (SELECT 1 FROM shifts)
     OR EXISTS (SELECT 1 FROM stock_movements WHERE user_id IS NOT NULL)
     OR EXISTS (SELECT 1 FROM activity_log) OR EXISTS (SELECT 1 FROM users WHERE NOT is_demo) THEN
    RAISE EXCEPTION 'Database sudah berisi data operasional. Migrasi kolom user BIGINT -> UUID harus dilakukan manual.';
  END IF;
END $$;

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '', username text UNIQUE,
  role text NOT NULL DEFAULT 'cashier' CHECK (role IN ('owner','manager','cashier')),
  active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());

ALTER TABLE shifts DROP COLUMN cashier_id;
ALTER TABLE shifts ADD COLUMN cashier_id uuid NOT NULL REFERENCES profiles(id);
ALTER TABLE transactions DROP COLUMN cashier_id;
ALTER TABLE transactions ADD COLUMN cashier_id uuid REFERENCES profiles(id);
ALTER TABLE stock_movements DROP COLUMN user_id;
ALTER TABLE stock_movements ADD COLUMN user_id uuid REFERENCES profiles(id);
ALTER TABLE activity_log DROP COLUMN user_id;
ALTER TABLE activity_log ADD COLUMN user_id uuid REFERENCES profiles(id);
DROP TABLE users;

CREATE FUNCTION public.app_role() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM profiles WHERE id = auth.uid() AND active $$;

-- Pengguna pertama menjadi owner; berikutnya cashier. Role TIDAK diambil dari metadata pendaftaran.
CREATE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles(id, full_name, role)
  VALUES (NEW.id, coalesce(NEW.raw_user_meta_data->>'full_name',''),
          CASE WHEN NOT EXISTS (SELECT 1 FROM profiles) THEN 'owner' ELSE 'cashier' END);
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Mencegah kenaikan role sendiri (bukan SECURITY DEFINER agar current_user = pemanggil)
CREATE FUNCTION public.profiles_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.active IS DISTINCT FROM OLD.active OR NEW.id IS DISTINCT FROM OLD.id)
     AND current_user NOT IN ('postgres','supabase_admin','service_role')
     AND coalesce(public.app_role(),'') <> 'owner' THEN
    RAISE EXCEPTION 'Hanya owner yang boleh mengubah role atau status akun';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER profiles_guard BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION public.profiles_guard();

-- RLS: aktif di semua tabel; tanpa policy = ditolak
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','settings','suppliers','ingredients','menus','recipes','shifts','transactions',
    'transaction_items','payments','purchases','purchase_items','stock_movements','expenses','manual_incomes','activity_log'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['settings','menus','recipes','ingredients'] LOOP   -- semua staff aktif boleh membaca
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (app_role() IS NOT NULL)', t||'_read', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['menus','recipes','ingredients','suppliers','purchases','purchase_items','expenses','manual_incomes'] LOOP
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO authenticated USING (app_role() IN (''owner'',''manager'')) WITH CHECK (app_role() IN (''owner'',''manager''))', t||'_mgr', t);
  END LOOP;
END $$;
CREATE POLICY settings_owner ON settings FOR ALL TO authenticated USING (app_role() = 'owner') WITH CHECK (app_role() = 'owner');
CREATE POLICY profiles_read ON profiles FOR SELECT TO authenticated USING (id = auth.uid() OR app_role() = 'owner');
CREATE POLICY profiles_upd ON profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR app_role() = 'owner') WITH CHECK (id = auth.uid() OR app_role() = 'owner');
-- Transaksi hanya dibuat lewat fungsi create_sale (tanpa policy INSERT/UPDATE langsung)
CREATE POLICY tx_read ON transactions FOR SELECT TO authenticated USING (app_role() IN ('owner','manager') OR (app_role() = 'cashier' AND cashier_id = auth.uid()));
CREATE POLICY txi_read ON transaction_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM transactions t WHERE t.id = transaction_id));
CREATE POLICY pay_read ON payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM transactions t WHERE t.id = transaction_id));
CREATE POLICY stockmv_read ON stock_movements FOR SELECT TO authenticated USING (app_role() IN ('owner','manager'));
CREATE POLICY shifts_mgr ON shifts FOR ALL TO authenticated USING (app_role() IN ('owner','manager')) WITH CHECK (app_role() IN ('owner','manager'));
CREATE POLICY shifts_own ON shifts FOR ALL TO authenticated USING (app_role() = 'cashier' AND cashier_id = auth.uid()) WITH CHECK (app_role() = 'cashier' AND cashier_id = auth.uid());
CREATE POLICY log_owner ON activity_log FOR SELECT TO authenticated USING (app_role() = 'owner');

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

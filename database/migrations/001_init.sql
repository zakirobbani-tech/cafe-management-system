-- Semua uang = BIGINT Rupiah. Waktu = timestamptz (UTC), tampil Asia/Makassar.
CREATE TABLE users (id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('owner','manager','cashier')),
  active BOOLEAN NOT NULL DEFAULT true, is_demo BOOLEAN NOT NULL DEFAULT false);
CREATE TABLE settings (key TEXT PRIMARY KEY, value JSONB NOT NULL); -- nama kafe, tax_bp, service_bp, dll
CREATE TABLE suppliers (id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, phone TEXT, address TEXT, notes TEXT, is_demo BOOLEAN NOT NULL DEFAULT false);
CREATE TABLE ingredients (id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, category TEXT, unit TEXT NOT NULL,
  stock_qty BIGINT NOT NULL DEFAULT 0, min_qty BIGINT NOT NULL DEFAULT 0,
  avg_cost_milli BIGINT NOT NULL DEFAULT 0, supplier_id BIGINT REFERENCES suppliers(id), expiry_date DATE,
  is_demo BOOLEAN NOT NULL DEFAULT false);
CREATE TABLE menus (id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Coffee','Non-Coffee','Tea','Food','Snack','Dessert','Other')),
  price BIGINT NOT NULL CHECK (price >= 0), available BOOLEAN NOT NULL DEFAULT true, is_demo BOOLEAN NOT NULL DEFAULT false);
CREATE TABLE recipes (menu_id BIGINT REFERENCES menus(id) ON DELETE CASCADE,
  ingredient_id BIGINT REFERENCES ingredients(id), qty BIGINT NOT NULL CHECK (qty > 0), PRIMARY KEY (menu_id, ingredient_id));
CREATE TABLE shifts (id BIGSERIAL PRIMARY KEY, cashier_id BIGINT NOT NULL REFERENCES users(id),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(), closed_at TIMESTAMPTZ,
  opening_cash BIGINT NOT NULL, counted_cash BIGINT, expected_cash BIGINT);
CREATE TABLE transactions (id BIGSERIAL PRIMARY KEY, number TEXT UNIQUE NOT NULL,
  idempotency_key TEXT UNIQUE, -- cegah transaksi offline tersimpan dua kali
  status TEXT NOT NULL CHECK (status IN ('pending','paid','cancelled','refunded')),
  order_type TEXT NOT NULL CHECK (order_type IN ('dine_in','take_away','delivery')),
  subtotal BIGINT NOT NULL, discount BIGINT NOT NULL DEFAULT 0, service BIGINT NOT NULL DEFAULT 0,
  tax BIGINT NOT NULL DEFAULT 0, total BIGINT NOT NULL, refund_amount BIGINT NOT NULL DEFAULT 0,
  cancel_reason TEXT, cashier_id BIGINT REFERENCES users(id), shift_id BIGINT REFERENCES shifts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), is_demo BOOLEAN NOT NULL DEFAULT false);
CREATE TABLE transaction_items (id BIGSERIAL PRIMARY KEY, transaction_id BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  menu_id BIGINT REFERENCES menus(id), name TEXT NOT NULL, price BIGINT NOT NULL, qty INT NOT NULL CHECK (qty > 0),
  discount BIGINT NOT NULL DEFAULT 0, cogs BIGINT NOT NULL DEFAULT 0, note TEXT); -- cogs = snapshot HPP saat dijual
CREATE TABLE payments (id BIGSERIAL PRIMARY KEY, transaction_id BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  method TEXT NOT NULL, amount BIGINT NOT NULL CHECK (amount > 0));
CREATE TABLE purchases (id BIGSERIAL PRIMARY KEY, supplier_id BIGINT REFERENCES suppliers(id), purchased_at DATE NOT NULL,
  total BIGINT NOT NULL, payment_status TEXT NOT NULL CHECK (payment_status IN ('paid','unpaid')),
  confirmed BOOLEAN NOT NULL DEFAULT false, receipt_url TEXT, is_demo BOOLEAN NOT NULL DEFAULT false);
CREATE TABLE purchase_items (purchase_id BIGINT REFERENCES purchases(id) ON DELETE CASCADE,
  ingredient_id BIGINT REFERENCES ingredients(id), qty BIGINT NOT NULL, total_price BIGINT NOT NULL);
-- Setiap perubahan stok WAJIB punya baris di sini
CREATE TABLE stock_movements (id BIGSERIAL PRIMARY KEY, ingredient_id BIGINT NOT NULL REFERENCES ingredients(id),
  qty_change BIGINT NOT NULL, reason TEXT NOT NULL CHECK (reason IN ('purchase','sale','refund','opname','adjustment','waste')),
  ref_type TEXT, ref_id BIGINT, user_id BIGINT REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now());
-- Pembelian stok ditautkan via purchase_id (UNIQUE) agar tidak jadi pengeluaran ganda
CREATE TABLE expenses (id BIGSERIAL PRIMARY KEY, category TEXT NOT NULL, amount BIGINT NOT NULL CHECK (amount > 0),
  spent_at DATE NOT NULL, method TEXT, payee TEXT, note TEXT, receipt_url TEXT,
  purchase_id BIGINT UNIQUE REFERENCES purchases(id), is_demo BOOLEAN NOT NULL DEFAULT false);
CREATE TABLE manual_incomes (id BIGSERIAL PRIMARY KEY, category TEXT NOT NULL, amount BIGINT NOT NULL CHECK (amount > 0),
  received_at DATE NOT NULL, method TEXT, note TEXT, is_demo BOOLEAN NOT NULL DEFAULT false); -- bukan dari kasir
CREATE TABLE activity_log (id BIGSERIAL PRIMARY KEY, user_id BIGINT REFERENCES users(id), action TEXT NOT NULL,
  entity TEXT, entity_id BIGINT, detail JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX ON transactions (created_at, status);
CREATE INDEX ON stock_movements (ingredient_id, created_at);

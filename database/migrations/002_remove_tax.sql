-- Pajak dan service charge dihentikan. Kolom dipertahankan agar histori aman.
-- NOT VALID: aturan berlaku untuk baris baru/yang diubah, baris lama tidak diperiksa ulang.
ALTER TABLE transactions ALTER COLUMN tax SET DEFAULT 0, ALTER COLUMN service SET DEFAULT 0;
ALTER TABLE transactions ADD CONSTRAINT transactions_no_tax_chk CHECK (tax = 0 AND service = 0) NOT VALID;
ALTER TABLE transactions ADD CONSTRAINT transactions_total_chk CHECK (total = subtotal - discount) NOT VALID;
COMMENT ON COLUMN transactions.tax IS 'LEGACY: selalu 0 untuk transaksi baru';
COMMENT ON COLUMN transactions.service IS 'LEGACY: selalu 0 untuk transaksi baru';
-- Opsional, SETELAH diverifikasi tidak ada histori bernilai > 0:
--   ALTER TABLE transactions DROP COLUMN tax, DROP COLUMN service;
-- Rollback: ALTER TABLE transactions DROP CONSTRAINT transactions_no_tax_chk, DROP CONSTRAINT transactions_total_chk;

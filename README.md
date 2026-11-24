# PLACE #1 – Cafe Management System

POS, inventaris, resep/HPP, pengeluaran, laporan, dan shift kasir untuk kafe PLACE #1.

## Status (jujur)
| Bagian | Status |
|---|---|
| Pratinjau antarmuka (`preview/index.html`, data demo di memori) | Ada |
| Logika keuangan + unit test (`npm test`) | Ada |
| Skema database, RLS, fungsi `create_sale`, `refund_sale`, `restock_ingredient` + tes (`npm run test:db`) | Ada; migration 001-004 sudah dijalankan di project Supabase, 005 menyusul |
| Aplikasi Next.js: login, role, Dashboard, Kasir, Transaksi (refund), Stok (tambah stok) | Ada, build lolos; **perlu diuji langsung dengan akun Anda** |
| CRUD menu/bahan/resep, pengeluaran, pemasukan, supplier/pembelian, shift, laporan, export, karyawan, PWA offline, Storage | **Belum dibuat** (lihat `docs/ROADMAP.md`) |

## Aturan keuangan
- Tidak ada pajak dan tidak ada service charge. **Total = subtotal − diskon.** Kolom `tax`/`service` hanya legacy dan wajib 0.
- Uang = integer Rupiah (BIGINT). Biaya bahan = milli-rupiah per satuan dasar. Persediaan: moving weighted average.
- Omzet bersih = penjualan paid − diskon − refund. Pending/cancelled tidak dihitung. Pembelian stok bukan HPP.
- Laba adalah estimasi operasional, bukan laporan laba rugi akuntansi atau perhitungan pajak final.

## Menjalankan
```bash
npm test          # unit test keuangan (tanpa dependensi)
npm install       # sekali
npm run dev       # aplikasi di http://localhost:3000 (butuh .env.local)
npm run build     # build produksi
npm run test:db   # migration + RPC + RLS pada PostgreSQL lokal
```
Pratinjau: buka `preview/index.html` di browser. Setup database: `docs/SUPABASE_SETUP.md`. Jangan commit `.env*` (kecuali `.env.example`).

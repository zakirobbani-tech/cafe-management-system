# PLACE #1 – Cafe Management System

POS, inventaris, resep/HPP, pengeluaran, laporan, dan shift kasir untuk kafe PLACE #1.

## Status (jujur)
| Bagian | Status |
|---|---|
| Pratinjau antarmuka (`preview/index.html`, data demo di memori) | Ada, tanpa pajak |
| Logika keuangan + unit test (`npm test`) | Ada |
| Skema database, RLS, fungsi `create_sale` / `refund_sale` + tes (`npm run test:db`) | Ada, diuji di PostgreSQL lokal |
| Terhubung ke Supabase sungguhan | **Belum diuji** |
| Aplikasi Next.js, login, POS terhubung database, PWA, Storage, laporan | **Belum dibuat** (lihat `docs/ROADMAP.md`) |

## Aturan keuangan
- Tidak ada pajak dan tidak ada service charge. **Total = subtotal − diskon.** Kolom `tax`/`service` hanya legacy dan wajib 0.
- Uang = integer Rupiah (BIGINT). Biaya bahan = milli-rupiah per satuan dasar. Persediaan: moving weighted average.
- Omzet bersih = penjualan paid − diskon − refund. Pending/cancelled tidak dihitung. Pembelian stok bukan HPP.
- Laba adalah estimasi operasional, bukan laporan laba rugi akuntansi atau perhitungan pajak final.

## Menjalankan
```bash
npm test          # unit test keuangan (tanpa dependensi)
npm install       # sekali, untuk tes database
npm run test:db   # migration + RPC + RLS pada PostgreSQL lokal
```
Pratinjau: buka `preview/index.html` di browser. Setup database: `docs/SUPABASE_SETUP.md`. Jangan commit `.env*` (kecuali `.env.example`).

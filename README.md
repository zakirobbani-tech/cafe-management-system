# Cafe Management System

Sistem manajemen kafe: POS, inventaris, resep/HPP, pengeluaran, laporan, shift kasir.

## Status (jujur)
**Tahap 1 – Foundation.** Sudah ada: struktur repo, skema PostgreSQL, seed demo, dan logika keuangan
(pembulatan uang aman, pajak/service, omzet bersih, HPP moving average, laba, rekonsiliasi kas) lengkap dengan unit test.
**Belum ada:** UI, autentikasi, API, POS, PWA. Lihat `docs/ROADMAP.md`.

## Teknologi
Rencana: Next.js + Tailwind + PostgreSQL/Supabase. Saat ini: Node.js (ESM) murni untuk logika inti.

## Instalasi & menjalankan
```bash
git clone <url-repo> && cd cafe-management-system
npm test          # unit test (Node >= 18, tanpa dependensi)
```

## Database
1. Buat project Supabase (atau PostgreSQL lokal).
2. Jalankan `database/migrations/001_init.sql`, lalu (opsional) `database/seed/001_demo.sql`.
3. Salin `.env.example` ke `.env` dan isi kredensial. Jangan pernah commit `.env`.
4. Data demo ditandai `is_demo = true` sehingga bisa dihapus per tabel (`DELETE ... WHERE is_demo`).

## Aturan keuangan
- Uang = **integer Rupiah** (BIGINT), tanpa floating point. Pajak/service dalam basis points (1100 = 11%).
- Biaya bahan = **milli-rupiah per satuan dasar** (gram/ml/pcs).
- Persediaan: **moving weighted average**.
- Omzet bersih = penjualan paid − diskon − refund. Pending/cancelled tidak dihitung.
- Laba kotor = omzet bersih − HPP; laba operasional = laba kotor − biaya operasional (pembelian stok BUKAN biaya; HPP yang dipakai).
- Laba adalah estimasi operasional, bukan laporan laba rugi akuntansi / pajak final.

## Deployment
Hubungkan repo ke Vercel/Netlify setelah aplikasi web ditambahkan; isi environment variables sesuai `.env.example`.

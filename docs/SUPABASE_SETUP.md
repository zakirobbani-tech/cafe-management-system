# Panduan Supabase – PLACE #1 Cafe Management System

> **Status jujur:** database (migration, RLS, fungsi transaksi) sudah ditulis dan lulus `npm run test:db` pada PostgreSQL lokal
> dengan tiruan Supabase Auth. **Belum diuji pada project Supabase sungguhan**, dan **aplikasi Next.js belum dibuat**,
> sehingga langkah 7-10 baru bisa dijalankan setelah frontend tersambung. Nama menu di dashboard Supabase bisa berubah; rujuk https://supabase.com/docs.

## 1. Buat project
Daftar di supabase.com, **New project**, pilih region terdekat (mis. Singapore), simpan database password di password manager.

## 2. Ambil URL dan publishable key
Dashboard project: Project Settings → API (atau API Keys). Salin **Project URL** dan **publishable key** (aman untuk browser).

## 3. Siapkan secret key (server saja)
Dari halaman yang sama salin **secret key**. Simpan hanya di `.env.local` dan di Environment Variables Vercel. Jangan commit, jangan beri awalan `NEXT_PUBLIC_`.

## 4. Jalankan migration (berurutan)
SQL Editor → New query → tempel isi, jalankan satu per satu:
`001_init.sql` → `002_remove_tax.sql` → `003_auth_profiles_rls.sql` → `004_sales_functions.sql` → `005_categories_restock.sql`.
Migration 003 menolak berjalan jika database sudah berisi data operasional. Jangan ubah file yang sudah dijalankan; buat migration baru.

## 5. Buat akun Owner pertama
Authentication → Users → **Add user** (email + password). **Pengguna pertama otomatis menjadi owner**, berikutnya cashier. Role tidak pernah diambil dari data pendaftaran.
Setelah itu **matikan pendaftaran publik** (Authentication → sign-in/providers → nonaktifkan "Allow new users to sign up"). Verifikasi di SQL Editor: `select id, role from profiles;`

## 6. Seed DEMO (opsional, terpisah)
Hanya untuk percobaan: jalankan `database/seed/001_demo.sql`. Semua baris berlabel `is_demo`. Jangan dipakai di database produksi. Hapus nanti:
`delete from recipes where menu_id in (select id from menus where is_demo); delete from menus where is_demo; delete from ingredients where is_demo; delete from suppliers where is_demo;`

## 7. Isi menu PLACE #1 (estimasi)
Jalankan `database/seed/002_place1_menu_estimasi.sql` di SQL Editor: 24 menu sesuai daftar harga kafe. **Resep, stok awal, dan harga bahan hanya perkiraan** (berlabel `is_demo`).
Jangan dijalankan bersama `001_demo.sql`, dan cukup sekali. Sesuaikan stok lewat halaman Stok (Tambah stok) atau SQL: `update ingredients set stock_qty = 3000 where name = 'Biji Kopi';`

## 8. Jalankan aplikasi di komputer
Salin `.env.example` menjadi `.env.local`, isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Lalu `npm install`, `npm run dev`, buka http://localhost:3000 dan login dengan akun owner.
(`SUPABASE_SECRET_KEY` belum dipakai aplikasi saat ini; jangan diisi sampai dibutuhkan.)

## 9. Deploy ke Vercel
Import repo GitHub di vercel.com, framework Next.js. Isi Environment Variables: `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Deploy. Jika perlu, tambahkan URL Vercel di Supabase: Authentication → URL Configuration.

## 10. Transaksi pertama
Login → Kasir → pilih menu → Bayar. Periksa halaman Transaksi (tercatat), Stok (bahan berkurang sesuai resep), dan Dashboard (omzet, HPP, laba kotor). Uji refund dengan akun owner/manager.

## Tes lokal tanpa Supabase
`npm install && npm run test:db` menjalankan semua migration pada PostgreSQL (PGlite) dengan tiruan Auth.

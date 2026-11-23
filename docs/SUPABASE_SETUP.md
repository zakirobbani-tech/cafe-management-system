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
`001_init.sql` → `002_remove_tax.sql` → `003_auth_profiles_rls.sql` → `004_sales_functions.sql`.
Migration 003 menolak berjalan jika database sudah berisi data operasional. Jangan ubah file yang sudah dijalankan; buat migration baru.

## 5. Buat akun Owner pertama
Authentication → Users → **Add user** (email + password). **Pengguna pertama otomatis menjadi owner**, berikutnya cashier. Role tidak pernah diambil dari data pendaftaran.
Setelah itu **matikan pendaftaran publik** (Authentication → sign-in/providers → nonaktifkan "Allow new users to sign up"). Verifikasi di SQL Editor: `select id, role from profiles;`

## 6. Seed DEMO (opsional, terpisah)
Hanya untuk percobaan: jalankan `database/seed/001_demo.sql`. Semua baris berlabel `is_demo`. Jangan dipakai di database produksi. Hapus nanti:
`delete from recipes where menu_id in (select id from menus where is_demo); delete from menus where is_demo; delete from ingredients where is_demo; delete from suppliers where is_demo;`

## 7-10. Tersedia setelah aplikasi Next.js selesai
7. **Hubungkan aplikasi:** salin `.env.example` menjadi `.env.local`, isi URL, publishable key, secret key.
8. **Jalankan lokal:** `npm install` lalu `npm run dev`.
9. **Deploy Vercel:** Import repo GitHub, isi tiga environment variable di atas, deploy. GitHub Pages hanya untuk folder `preview/`.
10. **Transaksi pertama:** login sebagai owner, buat menu + resep + stok, lalu jual satu menu lewat POS. Penjualan hanya lewat fungsi `create_sale`
    (tidak bisa dari SQL Editor karena `auth.uid()` kosong di sana). Cek tabel `transactions`, `stock_movements`.

## Tes lokal tanpa Supabase
`npm install && npm run test:db` menjalankan semua migration pada PostgreSQL (PGlite) dengan tiruan Auth.

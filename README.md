# Personal Job & Career Tracker — starter MVP

Next.js + Supabase Auth/PostgreSQL + Gemini API. Fitur awal: login, dashboard, lowongan manual/draft AI, profil skill, skor transparan, CV teks dummy/anonim, review AI, lamaran, status, timeline, dan tindak lanjut. Tidak ada fitur otomatis mengambil isi URL atau notifikasi email.

## Persiapan

1. Siapkan Node.js 20+, akun Supabase, Vercel, dan Google AI Studio.
2. Buat project Supabase. Jalankan `supabase/schema.sql` **sekali** melalui SQL Editor pada project kosong. SQL ini membuat tabel, RLS, dan validasi relasi. Jangan menjalankan file kedua kalinya karena trigger/policy sudah ada.
3. Di Supabase Authentication, aktifkan Email provider. Untuk uji cepat, ikuti pengaturan konfirmasi email sesuai kebutuhan project dan cek email setelah daftar.
4. Salin `.env.example` menjadi `.env.local`. Ambil Project URL dan publishable/anon key dari Supabase; ambil API key dari Google AI Studio. Jangan gunakan service role key di frontend.
5. Jalankan `npm install` lalu `npm run dev`. Buka `http://localhost:3000`.

## Deploy Vercel

Unggah folder ini sebagai repository GitHub. Import repository di Vercel, framework Next.js. Isi tiga env (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`) dan opsional `GEMINI_MODEL`. Deploy. Di Supabase Authentication → URL Configuration, set Site URL ke URL deployment Vercel dan tambahkan redirect URL yang diperlukan untuk konfirmasi email.

## Alur coba

Daftar/masuk → tambah dua skill → tambahkan CV dummy (teks) → tambah lowongan dengan teks job description → klik Analisis → periksa/edit hasil → Simpan → Detail → Review CV → catat lamaran → ubah status → buat tindakan. Semua fitur tracker tetap dapat dipakai jika Gemini belum dikonfigurasi.

## Catatan pengembangan

- Gemini Free Tier: gunakan JD publik dan CV dummy/anonim; jangan kirim CV asli berisi identitas atau data kerja rahasia. Teks CV disimpan di database Supabase dan dikirim ke Gemini saat tombol review diklik.
- Skor = skill wajib yang sudah dikonfirmasi dan cocok secara nama / seluruh skill wajib yang sudah dikonfirmasi. Skill bertanda `learning` tidak dihitung cocok. Ini **bukan** estimasi peluang diterima.
- Tombol analisis hanya membuat draft; tidak ada auto-save. Jika nama perusahaan/jabatan kosong dari AI, isi manual.
- Rate limit endpoint AI dalam starter bersifat per instance serverless dan tidak global. Untuk pengguna publik, gunakan rate limit terpusat, validasi kepemilikan, audit keamanan, pembatasan biaya, dan kebijakan privasi sebelum rilis.
- Starter menyimpan CV sebagai teks. PDF, autoscraping URL, analisis skill alias, aturan notifikasi, edit/hapus lowongan, paginasi, dan antarmuka multi-user tingkat produksi perlu ditambahkan kemudian.
- Migrasi ke VPS: database PostgreSQL diekspor/migrasi, env diganti, aplikasi Next.js dapat dijalankan dengan `npm run build && npm start`.

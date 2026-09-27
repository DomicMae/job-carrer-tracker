# PRD — Personal Job & Career Tracker

**Versi:** 1.0 (MVP)  
**Tanggal:** 24 September 2026  
**Pemilik produk:** Ardon  
**Status:** Siap untuk implementasi awal

## 1. Ringkasan

Aplikasi web pribadi untuk menyimpan lowongan, mengelola proses lamaran, dan menyiapkan CV sesuai persyaratan pekerjaan. AI membantu mengekstrak data lowongan dan mereview kecocokan CV; pengguna selalu memeriksa dan menyetujui hasil sebelum data lowongan disimpan atau saran CV diterapkan. Prototipe menggunakan layanan gratis: Next.js pada Vercel Hobby, Supabase Free untuk database dan autentikasi, serta Gemini API Free Tier dengan data uji dummy atau anonim.

## 2. Masalah dan tujuan

**Masalah:** Riwayat lamaran tersebar di situs lowongan, email, berkas CV, dan catatan pribadi. Sulit melihat status terkini, tenggat, CV yang dikirim, dan keterampilan yang perlu ditingkatkan.

**Tujuan MVP:** Pengguna dapat menjalankan satu siklus lengkap: menyimpan lowongan, memeriksa data hasil AI, membandingkan persyaratan dengan skill/CV, mencatat lamaran dan versi CV, mengikuti perkembangan seleksi, serta melihat tindakan berikutnya pada dashboard.

**Pengguna awal:** Satu pencari kerja (pemilik aplikasi). Struktur data memakai `user_id` sehingga dapat dikembangkan untuk beberapa akun tanpa mencampur data.

**Ukuran keberhasilan uji:** Dengan lima lowongan contoh, pengguna dapat membuat dan mengoreksi draft, mencatat lamaran dan perubahan status, menemukan jadwal tindak lanjut, serta mengetahui alasan setiap penilaian skill tanpa membuka catatan di luar aplikasi. Angka ini adalah skenario penerimaan produk, bukan target penggunaan publik.

## 3. Batas ruang lingkup

| Rilis MVP | Setelah MVP |
|---|---|
| Login; lowongan manual atau tempel teks; ekstraksi AI sebagai draft; review dan koreksi; skill profil; penilaian kecocokan; review CV dummy/anonim; versi CV; lamaran, timeline, next action, pengingat di dashboard | Membaca otomatis URL lowongan; notifikasi email/push; kalender; ekstensi browser; AI coach wawancara; analitik lanjutan; integrasi situs lowongan; penyimpanan CV asli dan dukungan pengguna publik |

MVP menyimpan URL sebagai referensi, tetapi **tidak mengandalkan scraping URL**. Jika pengguna hanya mempunyai link, ia menempel teks job description atau mengisi data manual. Tidak ada fitur mengirim lamaran otomatis.

## 4. Alur pengguna

1. Pengguna login, mengisi profil skill, dan menambahkan satu versi CV dummy atau anonim (teks atau file yang diekstrak ke teks).
2. Pengguna membuat lowongan dengan teks deskripsi, URL opsional, dan perintah **Analisis lowongan**.
3. AI mengembalikan **draft** perusahaan, posisi, lokasi, gaji jika tertulis, persyaratan wajib/tambahan, serta kutipan sumber. Kolom tidak ditemukan dikosongkan; pengguna mengoreksi dan menekan **Simpan lowongan**.
4. Aplikasi membandingkan persyaratan terverifikasi dengan profil skill; review AI menjelaskan bukti di CV, hal yang belum tertulis, dan saran perbaikan yang tidak mengarang pengalaman.
5. Pengguna memilih versi CV dan mencatat lamaran beserta tanggal. Setiap perubahan status membuat entri timeline.
6. Pengguna mengisi next action dan due date; dashboard menunjukkan lamaran aktif, distribusi status, dan tindakan terdekat/terlambat.
7. Setelah tes/wawancara, pengguna mencatat hasil, pertanyaan teknis, dan catatan pribadi; proses berakhir dengan offer, rejected, withdrawn, atau closed.

## 5. Kebutuhan fungsional dan kriteria penerimaan

### F1. Akun dan kepemilikan data — P0

- Login menggunakan Supabase Auth; semua catatan hanya terlihat dan dapat diubah oleh pemiliknya.
- Akses tanpa sesi ke halaman privat dialihkan ke login. Kebijakan Row Level Security (RLS) diterapkan untuk tabel pengguna dan file CV jika memakai Storage.
- **Selesai bila:** akun A tidak dapat membaca atau mengubah data akun B melalui UI maupun permintaan langsung.

### F2. Lowongan dan ekstraksi AI — P0

- Form menerima teks job description; perusahaan, jabatan, URL, lokasi, rentang gaji, mata uang, dan batas lamaran dapat diedit. Gaji bersifat opsional dan hanya diisi otomatis bila tertulis di sumber.
- Tombol analisis menghasilkan draft JSON terstruktur berisi field dan persyaratan dengan kategori `required`/`preferred`, kutipan sumber, dan `unknown` bila tidak ada bukti.
- AI tidak langsung menulis ke database; pengguna meninjau hasil lalu memilih simpan/batal. Form tetap bisa dipakai tanpa AI, termasuk saat kuota habis atau API gagal.
- **Selesai bila:** data keliru dapat diperbaiki sebelum disimpan; informasi yang tidak ada tidak dibuat-buat; kegagalan AI tidak menghilangkan input pengguna.

### F3. Profil skill dan kecocokan — P0

- Pengguna mengelola skill pribadi dengan tingkat penguasaan sederhana (`learning`, `used_in_project`, `used_at_work`) dan contoh bukti opsional.
- Persyaratan lowongan dapat disunting; penamaan setara seperti `PostgreSQL` dan `SQL` tidak otomatis dianggap sama tanpa aturan alias/konfirmasi pengguna.
- Tampilkan status per persyaratan: `verified_match`, `needs_confirmation`, `missing`, atau `unknown`.
- **Skor kecocokan** pada MVP = jumlah persyaratan wajib terverifikasi yang cocok / jumlah persyaratan wajib yang diketahui × 100, dibulatkan. Preferensi ditampilkan terpisah. Jika tidak ada persyaratan wajib yang diketahui, skor menjadi `N/A`.
- Skor menggambarkan kecocokan terhadap daftar persyaratan, **bukan peluang diterima kerja**. Tampilkan pembilang/penyebut dan alasan untuk setiap skill.
- **Selesai bila:** perubahan skill atau persyaratan memperbarui skor dan daftar gap; contoh 3 dari 5 syarat wajib cocok menunjukkan 60%.

### F4. Versi CV dan review AI — P0

- Pengguna menyimpan label versi, tanggal, dan teks CV dummy/anonim; file PDF dapat ditambahkan bila parsing dan akses privat sudah siap. Satu lamaran menunjuk ke versi CV yang dipakai saat mengirim.
- Review AI menerima deskripsi lowongan terverifikasi dan isi CV, lalu mengembalikan: bukti yang relevan, persyaratan yang belum terlihat di CV, saran revisi, dan pernyataan mana yang perlu dikonfirmasi pengguna.
- AI dilarang menulis pengalaman, sertifikasi, lama kerja, atau hasil kuantitatif yang tidak didukung CV/profil. Hasil review tidak mengubah CV secara otomatis.
- **Selesai bila:** pengguna dapat melihat versi CV yang dikirim untuk setiap lamaran; review menyebut bukti atau secara eksplisit menyatakan bukti tidak ditemukan.

### F5. Lamaran, status, dan timeline — P0

- Satu lowongan dapat memiliki satu lamaran aktif milik pengguna; pengiriman ulang untuk posisi yang sama boleh dicatat sebagai lamaran baru bila disengaja.
- Status: `saved`, `applied`, `screening`, `interview`, `technical_test`, `offer`, `rejected`, `withdrawn`, `closed`. Pengguna boleh memperbaiki status; setiap perubahan tercatat dengan waktu dan catatan opsional.
- Catatan wawancara dan pertanyaan teknis adalah entri timeline bertipe, bukan kolom teks tunggal yang ditimpa.
- **Selesai bila:** riwayat status tetap terlihat setelah perubahan berikutnya dan CV yang dipakai melamar tidak berubah karena pengguna membuat versi CV baru.

### F6. Tindak lanjut dan dashboard — P0

- Pengguna dapat membuat next action dengan judul, tanggal/jam tenggat, status selesai, dan kaitan ke lamaran. Waktu disimpan dalam UTC dan ditampilkan menurut zona waktu pengguna (default `Asia/Jakarta`).
- Dashboard menampilkan total lamaran, jumlah **status saat ini** per tahap, daftar tindakan terdekat dan terlambat, serta lowongan terbaru.
- `Applications` = jumlah yang pernah dikirim; kartu tahap lain = jumlah dengan status terkini di tahap itu. `Saved` tidak masuk Applications. Definisi ini ditampilkan agar total tidak ditafsirkan sebagai penjumlahan semua kartu.
- **Selesai bila:** memindahkan lamaran dari interview ke technical test mengurangi kartu interview dan menaikkan kartu technical test; tenggat lewat tampil sebagai terlambat.

## 6. Layar minimum

| Layar | Isi utama |
|---|---|
| Login | Masuk, keluar, dan kesalahan autentikasi |
| Dashboard | Kartu status, tindakan mendatang/terlambat, lowongan terbaru |
| Daftar lowongan | Pencarian teks, filter status, tambah lowongan |
| Buat/edit lowongan | Form manual, tempel JD, draft AI, bukti sumber, konfirmasi |
| Detail lowongan | Deskripsi, persyaratan, kecocokan, lamaran, CV terpilih, timeline, tindakan |
| Profil skill | Daftar skill, tingkat penguasaan, bukti pengalaman |
| CV | Versi CV dan hasil review per lowongan |

## 7. Model data awal

| Entitas | Field penting |
|---|---|
| `jobs` | `id`, `user_id`, `company_name`, `role_title`, `source_url`, `description_text`, `location`, `salary_min`, `salary_max`, `currency`, `deadline_at`, `created_at` |
| `job_requirements` | `id`, `job_id`, `skill_name`, `kind`, `source_excerpt`, `confirmed_by_user` |
| `user_skills` | `id`, `user_id`, `skill_name`, `proficiency`, `evidence_text` |
| `cv_versions` | `id`, `user_id`, `label`, `content_text` atau `private_file_path`, `created_at` |
| `applications` | `id`, `user_id`, `job_id`, `cv_version_id`, `status`, `applied_at`, `created_at` |
| `application_events` | `id`, `application_id`, `event_type`, `from_status`, `to_status`, `note`, `occurred_at` |
| `actions` | `id`, `application_id`, `title`, `due_at`, `completed_at` |
| `ai_reviews` | `id`, `job_id`, `cv_version_id`, `result_json`, `model_label`, `created_at` |

Seluruh tabel privat menggunakan kontrol kepemilikan. Berkas CV, bila digunakan, disimpan di bucket privat; tidak ada tautan publik. Hasil analisis yang sudah disetujui disimpan terpisah dari teks sumber agar koreksi pengguna tidak tertimpa analisis ulang.

## 8. Desain integrasi AI

**Endpoint server:** `POST /api/ai/extract-job` dan `POST /api/ai/review-cv`. Keduanya memerlukan sesi pengguna, validasi ukuran input, pembatasan frekuensi sederhana, batas waktu, serta pesan kesalahan yang dapat dipahami. `GEMINI_API_KEY` hanya berada pada server environment; jangan menaruhnya di frontend atau repository.

**Ekstraksi:** instruksi menyatakan sumber hanya teks yang diberikan pengguna; respons harus sesuai skema, memberi kutipan untuk setiap persyaratan dan `null` untuk data tak ditemukan. Backend memvalidasi JSON; pengguna memverifikasi draft.

**Review:** AI menjelaskan kecocokan berdasarkan teks CV dan JD terverifikasi. Aplikasi menghitung skor dari persyaratan yang dikonfirmasi, bukan mengambil persentase spekulatif dari AI. Bila AI gagal, profil skill dan pencatatan lamaran tetap berfungsi.

**Privasi testing:** Gemini API Free Tier digunakan dengan JD publik dan CV dummy/anonim. Jangan kirim CV asli dengan informasi pribadi atau data kerja rahasia ke layanan gratis. Tampilkan pemberitahuan sebelum tombol review; minimalkan data yang dikirim, jangan catat isi CV di log server, dan sediakan penghapusan versi CV/review. Keputusan memakai CV asli dan tier berbayar merupakan tahap terpisah.

## 9. Kebutuhan nonfungsional

- **Keamanan:** RLS, validasi server, akses privat file, pembatasan ukuran dokumen, kunci di environment, dan larangan memasukkan HTML JD langsung sebagai markup aktif.
- **Kegunaan:** mobile responsive, formulir dapat disimpan manual, status loading/error jelas, tombol simpan tidak tersembunyi saat AI gagal.
- **Performa:** daftar dan dashboard dipaginasi/diindeks sesuai kebutuhan; jangan mengirim seluruh riwayat lamaran ke AI untuk satu review.
- **Biaya:** awasi kuota Vercel, Supabase, dan Gemini; batasi panjang JD/CV serta jumlah panggilan AI per pengguna selama uji.
- **Portabilitas:** simpan definisi skema dan migrasi SQL di repository; panggilan AI melalui adapter sehingga pindah ke VPS atau penyedia lain tidak mengubah alur produk.

## 10. Tahapan implementasi

1. **Fondasi:** setup Next.js, Supabase, env, auth, migrasi, RLS, deploy Vercel.
2. **Tracker:** CRUD lowongan manual, lamaran, status, timeline, next action, dashboard.
3. **AI lowongan:** tempel JD, ekstraksi terstruktur, bukti sumber, layar koreksi, fallback manual.
4. **Skill dan CV:** profil skill, versi CV dummy/anonim, skor terhitung, review AI dan rekomendasi.
5. **Validasi MVP:** uji alur lima lowongan contoh termasuk data tidak lengkap, respons AI salah, error/kuota AI, akun berbeda, dan deadline lewat; perbaiki sebelum memasukkan data nyata.

## 11. Keputusan produk yang sudah ditetapkan

- Web dahulu, bukan aplikasi mobile native.
- Hosting awal memakai Vercel Hobby; database dan auth memakai Supabase Free; AI awal memakai Gemini Free Tier untuk data uji tanpa identitas pribadi.
- Input job description berbasis tempel teks; URL adalah referensi. Impor URL otomatis menyusul.
- Review dan koreksi manusia wajib sebelum menyimpan hasil ekstraksi.
- Angka persen dinamai **Skor Kecocokan Persyaratan** dan tidak diklaim sebagai peluang diterima.
- Pengingat MVP ditampilkan di aplikasi, tanpa pengiriman email/push.

## 12. Risiko dan penanganan

| Risiko | Penanganan MVP |
|---|---|
| Ekstraksi AI salah atau berhalusinasi | Draft dengan kutipan sumber, field kosong bila tak ada data, konfirmasi pengguna |
| CV memuat data pribadi | Testing dengan CV dummy/anonim; fitur unggah asli ditunda |
| Kuota gratis habis / layanan dijeda | Input manual dan catatan tetap berjalan; tampilkan error dan kuota yang bisa dipantau |
| Nama skill berbeda padahal terkait | Alias skill terbatas dan konfirmasi pengguna; jangan klaim otomatis setara |
| Skor menyesatkan | Tampilkan rumus, hitungan pembilang/penyebut, status setiap persyaratan dan label nonprediktif |

## 13. Definition of Done MVP

Pengguna dapat login, menambah lowongan manual atau dari draft AI, mengoreksi semua field, mengelola skill dan CV dummy, melihat skor beserta alasan, mencatat lamaran serta versi CV, mengubah status dengan riwayat yang tetap tersimpan, menambah tenggat, dan melihatnya di dashboard. Data antarakun terisolasi, API key tidak terekspos, error AI tidak memblokir tracker, serta aplikasi bisa diakses dari deployment Vercel dengan layanan gratis selama dalam batas kuota penyedia.

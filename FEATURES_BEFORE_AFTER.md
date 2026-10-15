# 🚀 Dokumentasi Fitur & Perbandingan (Before vs After)

Dokumen ini merangkum seluruh fitur yang telah dibuat dan ditingkatkan pada aplikasi **Personal Job & Career Tracker**, lengkap dengan perbandingan **Before (Sebelumnya)** dan **After (Sekarang)**.

---

## 📊 Ringkasan Perubahan Fitur

| No | Modul / Fitur | Before (Sebelumnya) | After (Sekarang) |
|---|---|---|---|
| 1 | **Profil Skill (Tab Skill)** | Hanya ada input *Nama Skill*, *Tingkat Penguasaan*, dan *Bukti*. | Ditambahkan field *Label / Kategori Profil*, *Nama*, *Nomor Telepon*, dan *Gmail*. |
| 2 | **Manajemen CV (Tab Versi CV)** | Hanya ada 1 textarea umum (*Teks CV*) untuk semua isi resume. | Diperluas menjadi **Modular Hybrid**: Data Kontak, Pengalaman Kerja, Pendidikan, Proyek, dan Organisasi. |
| 3 | **Trigger Ekstraksi AI (CV)** | AI otomatis berjalan saat file di-upload/di-paste. | Disediakan tombol manual **"✨ Ekstrak & Analisis CV dengan Gemini AI"** di bawah kotak upload. |
| 4 | **Tata Letak Layout CV** | Form input CV menggunakan 2 kolom berdampingan yang sempit dan terpotong. | Menggunakan **1 baris 1 kolom penuh (100% full-width)** dengan textarea lebih tinggi & rapi. |
| 5 | **Format Penulisan AI CV** | Seluruh teks dijadikan satu paragraf padat tanpa jeda yang jelas. | AI memformat per entri dengan bullet points (`•`) dan jeda baris kosong (*newline*) yang mudah dibaca. |
| 6 | **Sinkronisasi Teks CV** | Pengguna harus mengetik ulang jika ingin menggabungkan teks. | Ditambahkan tombol **"🔄 Sinkronkan dari Kolom di Atas"** serta auto-merge otomatis saat menyimpan. |
| 7 | **Error Handling Server / AI** | Crash dengan pesan `SyntaxError: Unexpected token '<'` jika respon HTML / 413. | Safe JSON response parsing dengan pesan ramah (misal: ukuran file terlalu besar / sesi kedaluwarsa). |

---

## 🔍 Detail Perbandingan per Fitur

---

### 1. Tab Profil Skill (User Skills)
* **Sebelumnya (Before)**:
  - Form hanya menerima skill teknis lepas tanpa identitas pemilik profil.
  - Data profil (nama & kontak) belum bisa dikelompokkan berdasarkan label kategori.
* **Sekarang (After)**:
  - Tersedia input **Label / Kategori Profil** (contoh: *Profil Utama / Software Engineer*).
  - Tersedia input **Nama Lengkap**, **Nomor Telepon**, dan **Gmail**.
  - Tetap terintegrasi dengan perhitungan skor kecocokan skill lowongan.

---

### 2. Ekstraksi Dokumen CV (Multimodal AI)
* **Sebelumnya (Before)**:
  - Saat file CV (PDF / Gambar) diunggah atau dipaste, sistem langsung memicu API AI secara otomatis.
  - Hasil ekstraksi hanya masuk ke satu kotak teks besar.
* **Sekarang (After)**:
  - Pengguna bebas mengunggah, mengganti, atau melihat preview file CV terlebih dahulu.
  - Ekstraksi AI baru berjalan ketika pengguna menekan tombol **"✨ Ekstrak & Analisis CV dengan Gemini AI"**.
  - AI memecah hasil ekstraksi ke masing-masing modul:
    - 👤 **Data Kontak**: Nama, Nomor WhatsApp, Email/Gmail
    - 🏢 **Pengalaman Kerja (Work Experience)**
    - 🎓 **Riwayat Pendidikan (Education)**
    - 🚀 **Proyek & Portofolio (Projects)**
    - 👥 **Organisasi & Kegiatan (Organization / Volunteer)**

---

### 3. Tampilan & Ergonomi Input Form (UI/UX)
* **Sebelumnya (Before)**:
  - Modul input diletakkan dalam 2 kolom grid sehingga teks panjang seperti deskripsi pekerjaan menjadi terhimpit dan sulit dibaca.
  - Textarea berukuran kecil dan rapat.
* **Sekarang (After)**:
  - Setiap modul menggunakan **1 baris 1 kolom penuh (Full Width)**.
  - Textarea memiliki tinggi lega (`rows={6}` s/d `rows={8}`) dengan `line-height: 1.65` dan kemampuan *vertical resizing*.
  - Pemisahan antar entri kerja/proyek memiliki jarak baris kosong yang rapi.

---

### 4. Sinkronisasi & Penyimpanan Versi CV
* **Sebelumnya (Before)**:
  - Form text tunggal rawan kehilangan struktur saat diedit.
* **Sekarang (After)**:
  - Terdapat tombol **"🔄 Sinkronkan dari Kolom di Atas"** untuk mengompilasi field modular ke format resume siap pakai.
  - Saat tombol **"💾 Simpan Versi CV"** diklik, jika *Teks Lengkap CV* belum terisi, sistem otomatis menggabungkan seluruh field modular menjadi teks CV terpadu.

---

### 5. Resiliensi API & Error Handling
* **Sebelumnya (Before)**:
  - Jika file gambar berukuran besar dikirim dan server Next.js mengembalikan halaman HTML 413, aplikasi memunculkan error fatal JSON syntax.
* **Sekarang (After)**:
  - Fungsi `callAi` membaca respon secara aman (`response.text()` + `JSON.parse` safe try-catch).
  - Menampilkan pesan error spesifik dan solutif jika terjadi kegagalan server atau masalah jaringan.

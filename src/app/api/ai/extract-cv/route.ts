import { aiGuard, extractedCv, extractCvInput, generateJson } from '@/lib/ai';

export async function POST(request: Request) {
  const guard = await aiGuard(request);
  if (guard.error) return guard.error;

  const body = await request.json().catch(() => null);
  const parsed = extractCvInput.safeParse(body);
  if (!parsed.success) {
    const issueMsg = parsed.error.issues[0]?.message || 'Input file CV tidak valid.';
    return Response.json({ error: issueMsg }, { status: 400 });
  }

  const promptInstruction = `Anda adalah asisten karir profesional, penerjemah ahli, dan parser dokumen/CV yang sangat teliti. Tugas Anda adalah membaca seluruh isi CV/Resume (baik dari file lampiran PDF/Gambar atau teks) lalu mengekstrak serta merapikan datanya secara terstruktur ke dalam BAHASA INDONESIA.

PANDUAN UTAMA BAHASA & AUTO-TRANSLATE (SANGAT PENTING):
1. WAJIB MENTERJEMAHKAN KE BAHASA INDONESIA:
   - Jika dokumen CV sumber menggunakan BAHASA INGGRIS atau bahasa asing lainnya, Anda WAJIB menterjemahkan secara otomatis (auto-translate) seluruh konten teks hasil ekstraksi ke dalam BAHASA INDONESIA yang baku, formal, profesional, dan mengalir alami.
   - Terjemahkan deskripsi tugas, tanggung jawab, pencapaian pekerjaan, jurusan/gelar pendidikan, deskripsi proyek, dan kegiatan organisasi ke Bahasa Indonesia.
   - Seluruh nilai pada "work_experience", "education", "projects", "organization", dan "cv_text" HARUS MENGGUNAKAN BAHASA INDONESIA.
2. PENGECUALIAN YANG TETAP MENGGUNAKAN ASLINYA:
   - Nama orang (full_name) dan informasi kontak (email, nomor telepon) TETAP seperti aslinya.
   - Nama perusahaan, brand, institusi, atau universitas (contoh: "Google", "Universitas Indonesia", "Harvard University", "PT Telkom") TETAP seperti aslinya.
   - Istilah teknis industri, tools, bahasa pemrograman, dan framework teknologi (contoh: "React", "Node.js", "Golang", "Python", "Docker", "PostgreSQL", "AWS", "REST API", "Git", "CI/CD", "Scrum", dsb.) JANGAN diterjemahkan secara kaku/aneh, tetap gunakan istilah teknologinya.
   - Nama posisi / jabatan dapat menggunakan istilah yang lazim di industri teknologi Indonesia (contoh: "Backend Developer", "Frontend Engineer", "Data Analyst", atau "Pengembang Web").

PANDUAN EKSTRAKSI CV PER BAGIAN:
1. cv_title: Saran label singkat versi CV dalam Bahasa Indonesia berdasarkan keahlian/jabatan (contoh: "CV Pengembang Backend", "CV Frontend Developer", "CV Analis Data", "CV IT Support").
2. full_name: Nama lengkap pemilik CV jika ada (atau null jika tidak ada).
3. phone: Nomor telepon / WhatsApp pemilik CV jika ada (atau null jika tidak ada).
4. email: Alamat email / Gmail pemilik CV jika ada (atau null jika tidak ada).
5. work_experience: Riwayat pengalaman kerja (DALAM BAHASA INDONESIA). Format setiap entri:
   [Posisi / Jabatan] - [Nama Perusahaan / Organisasi] ([Bulan Tahun - Bulan Tahun])
   - Deskripsi tanggung jawab / pencapaian 1 dalam Bahasa Indonesia
   - Deskripsi tanggung jawab / pencapaian 2 dalam Bahasa Indonesia
   (Pisahkan antar riwayat pekerjaan dengan satu baris kosong).
6. education: Riwayat pendidikan (DALAM BAHASA INDONESIA). Format setiap entri:
   [Nama Universitas / Sekolah] ([Tahun Mulai - Tahun Selesai])
   - [Gelar & Jurusan dalam Bahasa Indonesia] | IPK/GPA: [nilai jika ada]
   - Aktivitas, Organisasi, atau Prestasi: [dalam Bahasa Indonesia jika ada]
   (Pisahkan antar riwayat pendidikan dengan satu baris kosong).
7. projects: Riwayat proyek / portofolio (DALAM BAHASA INDONESIA). Format setiap entri:
   [Nama Proyek] - [Perusahaan/Penyelenggara jika ada] ([Periode/Tahun])
   - Peran & Tech Stack: [Teknologi yang digunakan]
   - Deskripsi ringkas & pencapaian: [deskripsi dalam Bahasa Indonesia]
   (Pisahkan antar proyek dengan satu baris kosong).
8. organization: Riwayat organisasi / kegiatan sukarela (DALAM BAHASA INDONESIA). Format:
   [Nama Organisasi] ([Periode])
   - Peran / Jabatan: [Jabatan dalam Bahasa Indonesia]
   - Kontribusi / Program kerja: [penjelasan singkat dalam Bahasa Indonesia]
   (Pisahkan antar organisasi dengan satu baris kosong).
9. skills: Rangkuman seluruh keahlian, skill teknis, bahasa pemrograman, framework, tools, database, dan teknologi yang dikuasai kandidat dalam bentuk daftar nama skill dipisahkan koma (contoh: "React, Next.js, Node.js, TypeScript, PostgreSQL, Docker, Git, REST API").
10. cv_text: TULISKAN KEMBALI SELURUH ISI TEKS CV secara lengkap, bersih, dan berformat profesional DALAM BAHASA INDONESIA menggabungkan semua data pribadi, pengalaman kerja, pendidikan, skill, sertifikasi, proyek, dan organisasi dengan heading dan bullet points rapi.

PENTING: Kembalikan jawaban HANYA BERUPA SATU OBJECT JSON TUNGGAL dengan struktur:
{
  "cv_title": "string saran label CV bahasa indonesia",
  "full_name": "string nama lengkap atau null",
  "phone": "string nomor telepon atau null",
  "email": "string email/gmail atau null",
  "work_experience": "string teks pengalaman kerja bahasa indonesia atau null",
  "education": "string teks pendidikan bahasa indonesia atau null",
  "projects": "string teks proyek bahasa indonesia atau null",
  "organization": "string teks organisasi bahasa indonesia atau null",
  "skills": "string daftar skill teknis dipisahkan koma atau null",
  "cv_text": "string teks lengkap isi CV bahasa indonesia berformat rapi"
}`;

  try {
    const parts: any[] = [];

    if (parsed.data.fileBase64 && parsed.data.fileMimeType) {
      let mime = parsed.data.fileMimeType;
      if (mime === 'image/jpg') mime = 'image/jpeg';
      parts.push({
        inlineData: {
          mimeType: mime,
          data: parsed.data.fileBase64,
        },
      });
    }

    if (parsed.data.text) {
      parts.push({
        text: `SUMBER ISI TEKS CV:\n${parsed.data.text}`,
      });
    }

    parts.push({
      text: promptInstruction,
    });

    let rawResult = await generateJson(parts);

    if (Array.isArray(rawResult)) {
      rawResult = rawResult[0] || {};
    }

    const validatedCv = extractedCv.parse(rawResult);
    return Response.json({ cv: validatedCv });
  } catch (err: any) {
    console.error('Extract CV AI Error Details:', err);
    const detailMsg = err?.message || 'Terjadi kesalahan saat memproses file CV dengan Gemini AI.';
    return Response.json(
      { error: `Ekstraksi CV gagal: ${detailMsg}` },
      { status: 502 }
    );
  }
}

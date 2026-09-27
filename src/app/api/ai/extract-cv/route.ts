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

  const promptInstruction = `Anda adalah asisten karir profesional dan parser dokumen/CV yang sangat teliti. Tugas Anda adalah membaca seluruh isi file CV/Resume (PDF atau Gambar) yang dilampirkan, lalu mengekstrak teksnya secara lengkap dan terstruktur.

PANDUAN EKSTRAKSI CV:
1. cv_title: Buat saran label singkat versi CV berdasarkan keahlian utama/jabatan di CV (contoh: "CV Backend Engineer", "CV Frontend Developer", "CV Data Analyst", "CV IT Support").
2. full_name: Nama lengkap pemilik CV jika tertera (atau null jika tidak ada).
3. phone: Nomor telepon / WhatsApp pemilik CV jika tertera (atau null jika tidak ada).
4. email: Alamat email / Gmail pemilik CV jika tertera (atau null jika tidak ada).
5. work_experience: Riwayat pengalaman kerja. Format setiap entri pekerjaan dengan sangat rapi:
   [Posisi / Jabatan] - [Nama Perusahaan / Organisasi] ([Bulan Tahun - Bulan Tahun])
   - Deskripsi tanggung jawab / pencapaian 1
   - Deskripsi tanggung jawab / pencapaian 2
   (Pisahkan antar riwayat pekerjaan dengan satu baris kosong).
6. education: Riwayat pendidikan. Format setiap institusi/pendidikan dengan rapi:
   [Nama Universitas / Sekolah] ([Tahun Mulai - Tahun Selesai])
   - [Gelar & Jurusan] | IPK/GPA: [nilai jika ada]
   - Aktivitas, Organisasi, atau Prestasi: [jika ada]
   (Pisahkan antar riwayat pendidikan dengan satu baris kosong).
7. projects: Riwayat proyek / portofolio. Format setiap proyek dengan rapi:
   [Nama Proyek] - [Perusahaan/Penyelenggara jika ada] ([Periode/Tahun])
   - Peran & Tech Stack: [Teknologi yang digunakan]
   - Deskripsi ringkas & pencapaian: [deskripsi]
   (Pisahkan antar proyek dengan satu baris kosong).
8. organization: Riwayat organisasi / kegiatan sukarela / kepanitiaan. Format rapi:
   [Nama Organisasi] ([Periode])
   - Peran / Jabatan: [Jabatan]
   - Kontribusi / Program kerja: [penjelasan singkat]
   (Pisahkan antar organisasi dengan satu baris kosong).
9. cv_text: TULISKAN KEMBALI SELURUH ISI TEKS CV secara lengkap, bersih, dan berformat profesional menggabungkan semua data pribadi, pengalaman, pendidikan, skill, sertifikasi, proyek, dan organisasi dengan heading dan bullet points.

PENTING: Kembalikan jawaban HANYA BERUPA SATU OBJECT JSON TUNGGAL dengan struktur:
{
  "cv_title": "string saran label CV",
  "full_name": "string nama lengkap atau null",
  "phone": "string nomor telepon atau null",
  "email": "string email/gmail atau null",
  "work_experience": "string teks pengalaman kerja atau null",
  "education": "string teks pendidikan atau null",
  "projects": "string teks proyek atau null",
  "organization": "string teks organisasi atau null",
  "cv_text": "string teks lengkap isi CV berformat rapi"
}`;

  try {
    let mime = parsed.data.fileMimeType;
    if (mime === 'image/jpg') mime = 'image/jpeg';

    const parts: any[] = [
      {
        inlineData: {
          mimeType: mime,
          data: parsed.data.fileBase64,
        },
      },
      {
        text: promptInstruction,
      },
    ];

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

import { aiGuard, extracted, extractInput, generateJson } from '@/lib/ai';
import { scanQrCodeFromBase64 } from '@/lib/qr';

export async function POST(request: Request) {
  const guard = await aiGuard(request);
  if (guard.error) return guard.error;

  const body = await request.json().catch(() => null);
  const parsed = extractInput.safeParse(body);
  if (!parsed.success) {
    const issueMsg = parsed.error.issues[0]?.message || 'Input tidak valid.';
    return Response.json({ error: issueMsg }, { status: 400 });
  }

  const promptInstruction = `Anda adalah asisten karir profesional dengan kemampuan Computer Vision dan OCR yang handal. Tugas Anda adalah mengekstrak dan merapikan data lowongan kerja dari gambar atau teks yang diberikan.

PANDUAN EKSTRAKSI & FORMATTING:
1. company_name: 
   - UTAMAKAN: Nama perusahaan yang tertulis langsung pada teks/isi lowongan.
   - JIKA TIDAK ADA TEKS NAMA PERUSAHAAN EKSPLISIT: Periksa logo atau watermark di bagian atas, sudut, header, atau footer poster lowongan (contoh: jika ada logo "agit - member of ASTRA", "GOTjob.id", "Wiratek", dsb., gunakan nama brand/organisasi dari logo tersebut).
   - Jangan biarkan null jika ada logo atau identitas visual perusahaan/platform pada gambar.

2. role_title: Posisi atau jabatan pekerjaan (contoh: "Junior Golang Developer", "Web Developer", "AI Engineer").
3. location: Lokasi kerja (contoh: "Jakarta", "Purwokerto, Jawa Tengah", "Remote", "Hybrid").
4. employment_type: Status pekerjaan / tipe kontrak (contoh: "Full-time", "Contract", "Internship", "Part-time", "Freelance").
5. experience_required: Pengalaman kerja yang dibutuhkan (contoh: "Min. 2 Tahun", "1-3 Tahun", "Fresh Graduate", "Min. 1 Tahun"), null jika tidak ada keterangan khusus.
6. source_url: Link / URL website, URL pendaftaran teks (contoh: "https://gotjob.id/jobs/..." atau "https://s.id/...").
7. deadline_at: Batas akhir pendaftaran / tanggal deadline dalam format ISO string (YYYY-MM-DD) jika tertulis (contoh: "30 September 2026" -> "2026-09-30"), null jika tidak ada.
8. description_text: SUSUN DAN RAPIKAN TEKS DESKRIPSI PEKERJAAN dengan struktur yang sangat mudah dibaca manusia menggunakan paragraf, heading/section yang jelas, dan bullet points (- ).
   Contoh format yang diinginkan untuk description_text:
   Posisi: Junior Golang Developer
   Lokasi: Jakarta | Status: Full-time

   Main Responsibilities:
   - Develop backend workflow and orchestration services using Golang and Temporal.
   - Design and implement workflows and activities for long-running HR business processes.
   - Translate business processes into reliable workflow states, activities, retries, and exception handling.
   - Integrate Temporal workflows with .NET services, APIs, databases, and other platform components.
   - Implement workflow retry, timeout, compensation, failure recovery, and idempotency mechanisms.
   - Monitor, troubleshoot, and optimize workflow execution and performance.
   - Develop unit and integration tests for workflows and activities.
   - Collaborate with BA, Architects, Backend Developers, and QA on end-to-end process implementation.

   Required Qualifications:
   - Bachelor's degree in Computer Science, Information Technology, or related field.
   - Min 2 years of backend development experience with good proficiency in Golang.
   - Hands-on knowledge of Temporal.io or similar workflow/orchestration platforms is highly preferable.
   - Strong understanding of REST APIs, distributed systems, asynchronous processing, and microservices.
   - Experience with relational databases such as PostgreSQL.
   - Familiar with Docker, Git, CI/CD, logging, and monitoring practices.

   Why Join Us:
   - Build What Matters: Real work, real impact.
   - Strong Team, Real Support: Grow together, never alone.
   - High Standards, Real Growth.

   Catatan:
   We never charge any fees during the recruitment process. Beware of any scams!

9. salary_min, salary_max: Angka gaji (number) hanya jika tertulis eksplisit.
10. currency: Mata uang (contoh "IDR" atau "USD"), default null jika tidak ada.
11. requirements: Ekstrak daftar skill/kualifikasi teknis & non-teknis pekerjaan. Setiap item harus memiliki:
   - "skill_name": nama keterampilan/teknologi/kualifikasi (contoh: "Golang", "Temporal.io", "PostgreSQL", "Docker", "REST API")
   - "kind": "required" (jika syarat wajib/utama) atau "preferred" (jika nilai tambah/opsional)
   - "source_excerpt": kutipan teks asli dari lowongan

PENTING: Kembalikan jawaban HANYA BERUPA SATU OBJECT JSON TUNGGAL (BUKAN ARRAY) dengan struktur:
{
  "company_name": "string atau null",
  "role_title": "string atau null",
  "location": "string atau null",
  "employment_type": "string atau null",
  "experience_required": "string atau null",
  "source_url": "string atau null",
  "deadline_at": "YYYY-MM-DD atau null",
  "description_text": "string berformat rapi dengan baris baru (newline) dan bullet points",
  "salary_min": null,
  "salary_max": null,
  "currency": "IDR",
  "requirements": [
    {
      "skill_name": "Golang",
      "kind": "required",
      "source_excerpt": "Min 2 years of backend development experience with good proficiency in Golang"
    }
  ]
}`;

  try {
    const parts: any[] = [];
    let qrDecodedUrl: string | null = null;

    // Jika ada file gambar / PDF
    if (parsed.data.fileBase64 && parsed.data.fileMimeType) {
      let mime = parsed.data.fileMimeType;
      if (mime === 'image/jpg') mime = 'image/jpeg';
      
      // Jalankan QR scanner paralel jika formatnya gambar
      if (mime.startsWith('image/')) {
        qrDecodedUrl = await scanQrCodeFromBase64(parsed.data.fileBase64);
      }

      parts.push({
        inlineData: {
          mimeType: mime,
          data: parsed.data.fileBase64,
        },
      });
    }

    // Jika ada teks tambahan dari deskripsi
    if (parsed.data.description && parsed.data.description.trim()) {
      parts.push({
        text: `Teks Tambahan:\n${parsed.data.description.trim()}`,
      });
    }

    // Masukkan instruksi prompt
    parts.push({
      text: promptInstruction,
    });

    let rawResult = await generateJson(parts);

    // Penanganan jika AI mengembalikan array [ { ... } ] bukannya object { ... }
    if (Array.isArray(rawResult)) {
      rawResult = rawResult[0] || {};
    }

    const validatedDraft = extracted.parse(rawResult);

    // Strategi Kombinasi: Jika ada URL hasil decode dari QR Code, gunakan untuk mengisi/mengganti source_url
    if (qrDecodedUrl) {
      validatedDraft.source_url = qrDecodedUrl;
    }

    return Response.json({ draft: validatedDraft });
  } catch (err: any) {
    console.error('Extract Job AI Error Details:', err);
    const detailMsg = err?.message || 'Terjadi kesalahan saat memproses gambar dengan Gemini AI.';
    return Response.json(
      { error: `Analisis AI gagal: ${detailMsg}` },
      { status: 502 }
    );
  }
}

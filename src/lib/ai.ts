import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { requireUser } from './supabase';

export const extractInput = z.object({
  description: z.string().max(25000).optional(),
  fileBase64: z.string().optional(),
  fileMimeType: z.string().optional(),
  fileName: z.string().optional(),
}).refine(data => (data.description && data.description.length >= 10) || (data.fileBase64 && data.fileMimeType), {
  message: 'Harap masukkan teks lowongan (minimal 10 karakter) atau unggah file/gambar lowongan.'
});

export const extractCvInput = z.object({
  fileBase64: z.string().min(1, 'File base64 wajib ada'),
  fileMimeType: z.string().min(1, 'Mime type wajib ada'),
  fileName: z.string().optional(),
});

export const reviewInput = z.object({
  description: z.string().min(20).max(25000),
  cv: z.string().min(20).max(25000)
});

const req = z.object({
  skill_name: z.string().min(1),
  kind: z.enum(['required', 'preferred']),
  source_excerpt: z.string().optional().default('')
});

export const extracted = z.object({
  company_name: z.string().nullable().optional(),
  role_title: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  employment_type: z.string().nullable().optional(),
  experience_required: z.string().nullable().optional(),
  source_url: z.string().nullable().optional(),
  deadline_at: z.string().nullable().optional(),
  description_text: z.string().nullable().optional(),
  salary_min: z.number().nullable().optional(),
  salary_max: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  requirements: z.array(req).default([])
});

export const extractedCv = z.object({
  cv_title: z.string().nullable().optional(),
  full_name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  education: z.string().nullable().optional(),
  work_experience: z.string().nullable().optional(),
  projects: z.string().nullable().optional(),
  organization: z.string().nullable().optional(),
  cv_text: z.string().min(10, 'Teks CV tidak boleh kosong')
});

export const reviewed = z.object({
  relevant_evidence: z.array(z.string()).default([]),
  missing_from_cv: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([])
});

const calls = new Map<string, number[]>();

export async function aiGuard(request: Request) {
  const user = await requireUser(request);
  if (!user) return { error: Response.json({ error: 'Silakan login kembali.' }, { status: 401 }) };
  const now = Date.now();
  const recent = (calls.get(user.id) ?? []).filter(time => now - time < 60_000);
  if (recent.length >= 15) return { error: Response.json({ error: 'Tunggu sebentar sebelum meminta analisis lagi.' }, { status: 429 }) };
  calls.set(user.id, [...recent, now]);
  if (!process.env.GEMINI_API_KEY) return { error: Response.json({ error: 'GEMINI_API_KEY belum dikonfigurasi di file .env.local.' }, { status: 503 }) };
  return { user };
}

export async function generateJson(contents: string | any[]) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  
  const output = await ai.models.generateContent({
    model: modelName,
    contents: contents,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.1
    }
  });

  const rawText = output.text || '{}';
  const cleaned = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(cleaned);
}

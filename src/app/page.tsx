'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { browserDb } from '@/lib/supabase';
import { evaluateRequirements, type Requirement, type SkillProficiency } from '@/lib/score';

type Job = {
  id: string;
  company_name: string;
  role_title: string;
  source_url: string | null;
  description_text: string | null;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string | null;
  deadline_at: string | null;
  is_deleted?: boolean | null;
  created_at: string;
};

type Application = {
  id: string;
  job_id: string;
  status: string;
  cv_version_id: string | null;
  applied_at: string | null;
  created_at: string;
};

type Action = {
  id: string;
  application_id: string;
  title: string;
  due_at: string;
  completed_at: string | null;
};

type Skill = {
  id: string;
  skill_name: string;
  proficiency: SkillProficiency;
  evidence_text: string | null;
};

type Cv = {
  id: string;
  label: string;
  content_text: string;
  created_at: string;
};

type Event = {
  id: string;
  application_id: string;
  event_type: 'status' | 'interview_note' | 'technical_question' | 'note';
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  occurred_at: string;
};

type Draft = {
  company_name: string | null;
  role_title: string | null;
  location: string | null;
  employment_type?: string | null;
  experience_required?: string | null;
  source_url?: string | null;
  deadline_at?: string | null;
  description_text?: string | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string | null;
  requirements: Requirement[];
};

const STAGES = [
  'saved',
  'applied',
  'screening',
  'interview',
  'technical_test',
  'offer',
  'rejected',
  'withdrawn',
  'closed',
];

const STAGE_NAMES: Record<string, string> = {
  saved: 'Disimpan',
  applied: 'Melamar',
  screening: 'Screening',
  interview: 'Wawancara',
  technical_test: 'Tes Teknis',
  offer: 'Offer',
  rejected: 'Ditolak',
  withdrawn: 'Mundur',
  closed: 'Selesai',
};

const EMPLOYMENT_TYPES = [
  'Full-time',
  'Contract / Kontrak',
  'Internship / Magang',
  'Part-time / Paruh Waktu',
  'Freelance / Project-based',
  'Lainnya / Tidak Ditentukan',
];

export default function Home() {
  const [db, setDb] = useState<SupabaseClient | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'dashboard' | 'jobs' | 'new' | 'skills' | 'cv' | 'detail'>('dashboard');

  // Master Data
  const [jobs, setJobs] = useState<Job[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [cvs, setCvs] = useState<Cv[]>([]);

  // Selection / Detail
  const [selectedJobId, setSelectedJobId] = useState('');
  const [reqs, setReqs] = useState<Requirement[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  // New Job Form / AI Draft
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [employmentType, setEmploymentType] = useState('Full-time');
  const [locationVal, setLocationVal] = useState('');
  const [url, setUrl] = useState('');
  const [experienceVal, setExperienceVal] = useState('');
  const [deadlineVal, setDeadlineVal] = useState('');
  const [description, setDescription] = useState('');
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    mimeType: string;
    base64: string;
    previewUrl?: string;
  } | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Skill & Profil Data Form
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [skillLabel, setSkillLabel] = useState('');
  const [skillName, setSkillName] = useState('');
  const [skillLevel, setSkillLevel] = useState<SkillProficiency>('used_in_project');
  const [skillEvidence, setSkillEvidence] = useState('');

  // CV Form
  const [cvLabel, setCvLabel] = useState('CV Backend v1');
  const [cvFullName, setCvFullName] = useState('');
  const [cvPhone, setCvPhone] = useState('');
  const [cvEmail, setCvEmail] = useState('');
  const [cvExperience, setCvExperience] = useState('');
  const [cvEducation, setCvEducation] = useState('');
  const [cvProjects, setCvProjects] = useState('');
  const [cvOrganization, setCvOrganization] = useState('');
  const [cvText, setCvText] = useState('');
  const [cvSelected, setCvSelected] = useState('');
  const [uploadedCvFile, setUploadedCvFile] = useState<{
    name: string;
    mimeType: string;
    base64: string;
    previewUrl?: string;
  } | null>(null);
  const cvFileInputRef = useRef<HTMLInputElement | null>(null);
  const cvFormRef = useRef<HTMLDivElement | null>(null);

  // Edit & Preview CV Versions
  const [editingCvId, setEditingCvId] = useState<string | null>(null);
  const [editingCvLabel, setEditingCvLabel] = useState('');
  const [editingCvText, setEditingCvText] = useState('');
  const [previewCvId, setPreviewCvId] = useState<string | null>(null);

  // Application & Timeline Forms
  const [actionTitle, setActionTitle] = useState('');
  const [actionDue, setActionDue] = useState('');
  const [note, setNote] = useState('');
  const [noteType, setNoteType] = useState<'note' | 'interview_note' | 'technical_question'>('note');
  const [review, setReview] = useState<{
    relevant_evidence: string[];
    missing_from_cv: string[];
    suggestions: string[];
  } | null>(null);

  // Filter & Toggle Eyes (Soft Delete)
  const [search, setSearch] = useState('');
  const [showDeleted, setShowDeleted] = useState(false); // false = Eyes (hanya lowongan aktif), true = Eyes Off (semua termasuk soft delete)

  useEffect(() => {
    try {
      const client = browserDb();
      setDb(client);
      client.auth.getUser().then(({ data }) => setUser(data.user));
      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
      return () => subscription.unsubscribe();
    } catch (e) {
      setMessage(String(e));
    }
  }, []);

  async function refresh(client = db, uid = user?.id) {
    if (!client || !uid) return;
    const [j, a, x, s, c] = await Promise.all(
      ['jobs', 'applications', 'actions', 'user_skills', 'cv_versions'].map((t) =>
        client.from(t).select('*').eq('user_id', uid)
      )
    );
    for (const result of [j, a, x, s, c]) {
      if (result.error) {
        setMessage(result.error.message);
        return;
      }
    }
    setJobs((j.data ?? []) as Job[]);
    setApps((a.data ?? []) as Application[]);
    setActions((x.data ?? []) as Action[]);
    setSkills((s.data ?? []) as Skill[]);
    setCvs((c.data ?? []) as Cv[]);
  }

  useEffect(() => {
    if (db && user) void refresh(db, user.id);
  }, [db, user]);

  useEffect(() => {
    if (!db || !user || !selectedJobId) {
      setReqs([]);
      setEvents([]);
      return;
    }
    void Promise.all([
      db.from('job_requirements').select('*').eq('job_id', selectedJobId),
      db
        .from('application_events')
        .select('*')
        .in(
          'application_id',
          apps
            .filter((a) => a.job_id === selectedJobId)
            .map((a) => a.id)
            .concat('00000000-0000-0000-0000-000000000000')
        )
        .order('occurred_at', { ascending: false }),
    ]).then(([r, e]) => {
      setReqs((r.data ?? []) as Requirement[]);
      setEvents((e.data ?? []) as Event[]);
    });
  }, [db, user, selectedJobId, apps]);

  async function save(table: string, record: Record<string, unknown>) {
    if (!db || !user) return false;
    const { error } = await db.from(table).insert({ ...record, user_id: user.id });
    if (error) {
      setMessage(error.message);
      return false;
    }
    await refresh();
    setMessage('Berhasil disimpan.');
    return true;
  }

  async function authenticate(signup = false) {
    if (!db) return;
    setBusy(true);
    const { error } = signup
      ? await db.auth.signUp({ email, password })
      : await db.auth.signInWithPassword({ email, password });
    setMessage(
      error?.message ??
        (signup ? 'Akun berhasil dibuat. Silakan login atau periksa email jika verifikasi aktif.' : 'Berhasil masuk.')
    );
    setBusy(false);
  }

  async function callAi(endpoint: string, payload: object) {
    if (!db) return null;
    const { data } = await db.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setMessage('Sesi login telah berakhir. Silakan login kembali.');
      return null;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/ai/' + endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      let result: any = null;
      try {
        result = JSON.parse(text);
      } catch (parseErr) {
        if (response.status === 413) {
          throw new Error('Ukuran file/gambar terlalu besar untuk diproses server (Maksimal ~4MB).');
        }
        if (!response.ok) {
          throw new Error(`Server error (${response.status}): ${response.statusText}`);
        }
        throw new Error('Format respon server tidak valid.');
      }

      if (!response.ok) {
        throw new Error(result?.error || `Permintaan gagal (${response.status})`);
      }
      return result;
    } catch (e: any) {
      setMessage(e.message || String(e));
      return null;
    } finally {
      setBusy(false);
    }
  }

  function processFile(file: File) {
    if (file.size > 8 * 1024 * 1024) {
      setMessage('Ukuran file maksimal 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = reader.result as string;
      const base64Data = resultStr.split(',')[1];
      setUploadedFile({
        name: file.name || `Pasted_Image_${Date.now()}.png`,
        mimeType: file.type || 'image/png',
        base64: base64Data,
        previewUrl: file.type.startsWith('image/') ? resultStr : undefined,
      });
      setMessage(`Gambar/file "${file.name || 'Pasted Image'}" berhasil dimuat. Klik "Ekstrak & Analisis" untuk membaca data.`);
    };
    reader.readAsDataURL(file);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  }

  function processCvFile(file: File) {
    if (file.size > 8 * 1024 * 1024) {
      setMessage('Ukuran file CV maksimal 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const resultStr = reader.result as string;
      const base64Data = resultStr.split(',')[1];
      const cvObj = {
        name: file.name || `Pasted_CV_${Date.now()}.png`,
        mimeType: file.type || 'application/pdf',
        base64: base64Data,
        previewUrl: file.type.startsWith('image/') ? resultStr : undefined,
      };
      setUploadedCvFile(cvObj);
      setMessage(`File CV "${cvObj.name}" berhasil diunggah! Klik tombol "Ekstrak & Analisis CV dengan AI" di bawah untuk memproses.`);
    };
    reader.readAsDataURL(file);
  }

  async function extractCvManual() {
    if (!uploadedCvFile && cvText.trim().length < 15) {
      setMessage('Harap upload file CV atau tempelkan teks CV (minimal 15 karakter) terlebih dahulu.');
      return;
    }

    const payload: {
      text?: string;
      fileBase64?: string;
      fileMimeType?: string;
      fileName?: string;
    } = {};

    if (uploadedCvFile) {
      payload.fileBase64 = uploadedCvFile.base64;
      payload.fileMimeType = uploadedCvFile.mimeType;
      payload.fileName = uploadedCvFile.name;
    }
    if (cvText.trim()) {
      payload.text = cvText.trim();
    }

    const r = await callAi('extract-cv', payload);

    if (r?.cv) {
      if (r.cv.cv_title) setCvLabel(r.cv.cv_title);
      if (r.cv.full_name) setCvFullName(r.cv.full_name);
      if (r.cv.phone) setCvPhone(r.cv.phone);
      if (r.cv.email) setCvEmail(r.cv.email);
      if (r.cv.work_experience) setCvExperience(r.cv.work_experience);
      if (r.cv.education) setCvEducation(r.cv.education);
      if (r.cv.projects) setCvProjects(r.cv.projects);
      if (r.cv.organization) setCvOrganization(r.cv.organization);
      if (r.cv.cv_text) setCvText(r.cv.cv_text);
      setMessage('✅ Teks CV berhasil diekstrak dan diterjemahkan otomatis ke Bahasa Indonesia oleh AI!');
    }
  }

  function loadCvIntoForm(c: Cv) {
    setEditingCvId(c.id);
    setCvLabel(c.label);
    setCvText(c.content_text);

    const text = c.content_text;

    // Ekstrak data pribadi jika ada
    const nameMatch = text.match(/-\s*Nama:\s*([^\n\r]+)/i);
    setCvFullName(nameMatch ? nameMatch[1].trim() : '');

    const phoneMatch = text.match(/-\s*No\.?\s*Telp(?:\/WA)?:\s*([^\n\r]+)/i);
    setCvPhone(phoneMatch ? phoneMatch[1].trim() : '');

    const emailMatch = text.match(/-\s*Email:\s*([^\n\r]+)/i);
    setCvEmail(emailMatch ? emailMatch[1].trim() : '');

    // Ekstrak riwayat pengalaman kerja, pendidikan, proyek, organisasi
    const expMatch = text.match(/PENGALAMAN KERJA:\s*\n([\s\S]*?)(?=\n\s*(?:PENDIDIKAN|PROYEK|ORGANISASI|DATA PRIBADI):|$)/i);
    setCvExperience(expMatch ? expMatch[1].trim() : '');

    const eduMatch = text.match(/PENDIDIKAN:\s*\n([\s\S]*?)(?=\n\s*(?:PENGALAMAN|PROYEK|ORGANISASI|DATA PRIBADI):|$)/i);
    setCvEducation(eduMatch ? eduMatch[1].trim() : '');

    const projMatch = text.match(/PROYEK(?:\s*&\s*PORTOFOLIO)?:\s*\n([\s\S]*?)(?=\n\s*(?:PENGALAMAN|PENDIDIKAN|ORGANISASI|DATA PRIBADI):|$)/i);
    setCvProjects(projMatch ? projMatch[1].trim() : '');

    const orgMatch = text.match(/ORGANISASI(?:\s*&\s*KEGIATAN|\s*&\s*VOLUNTEER)?:\s*\n([\s\S]*?)(?=\n\s*(?:PENGALAMAN|PENDIDIKAN|PROYEK|DATA PRIBADI):|$)/i);
    setCvOrganization(orgMatch ? orgMatch[1].trim() : '');

    setMessage(`✏️ Mode Edit Aktif: Data versi "${c.label}" telah dimuat ke form di bawah. Ubah input yang diperlukan lalu simpan.`);

    setTimeout(() => {
      cvFormRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  }

  function resetCvForm() {
    setEditingCvId(null);
    setCvLabel('CV Backend v1');
    setCvFullName('');
    setCvPhone('');
    setCvEmail('');
    setCvExperience('');
    setCvEducation('');
    setCvProjects('');
    setCvOrganization('');
    setCvText('');
    setUploadedCvFile(null);
    if (cvFileInputRef.current) cvFileInputRef.current.value = '';
  }

  // Support Paste (Ctrl + V) from clipboard anywhere on the page
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;

      if (tab === 'new') {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
              e.preventDefault();
              processFile(file);
              break;
            }
          }
        }
      } else if (tab === 'cv') {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
              e.preventDefault();
              processCvFile(file);
              break;
            }
          }
        }
      }
    }

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [tab]);

  async function extract() {
    if (!description.trim() && !uploadedFile) {
      setMessage('Harap masukkan teks lowongan atau unggah file/gambar lowongan terlebih dahulu.');
      return;
    }

    const r = await callAi('extract-job', {
      description: description.trim() || undefined,
      fileBase64: uploadedFile?.base64,
      fileMimeType: uploadedFile?.mimeType,
      fileName: uploadedFile?.name,
    });

    if (r?.draft) {
      setDraft(r.draft);
      if (r.draft.company_name) setCompany(r.draft.company_name);
      if (r.draft.role_title) setRole(r.draft.role_title);
      if (r.draft.location) setLocationVal(r.draft.location);
      if (r.draft.source_url) setUrl(r.draft.source_url);
      if (r.draft.experience_required) setExperienceVal(r.draft.experience_required);
      if (r.draft.deadline_at) setDeadlineVal(r.draft.deadline_at.split('T')[0]);
      if (r.draft.employment_type) {
        const match = EMPLOYMENT_TYPES.find(t => t.toLowerCase().includes(r.draft.employment_type.toLowerCase()));
        setEmploymentType(match || r.draft.employment_type);
      }
      if (r.draft.description_text && !description.trim()) {
        setDescription(r.draft.description_text);
      }
      setMessage('Data lowongan & QR Code berhasil diekstrak oleh AI! Silakan periksa, edit jika ada kesalahan, lalu simpan.');
    }
  }

  async function createJob() {
    if (!db || !user || !company.trim() || !role.trim()) {
      setMessage('Nama Perusahaan dan Posisi wajib diisi.');
      return;
    }
    setBusy(true);

    const fullLocationParts = [];
    if (locationVal.trim()) fullLocationParts.push(locationVal.trim());
    if (employmentType) fullLocationParts.push(employmentType);
    if (experienceVal.trim()) fullLocationParts.push(`Pengalaman: ${experienceVal.trim()}`);

    const fullLocation = fullLocationParts.join(' · ');

    const { data, error } = await db
      .from('jobs')
      .insert({
        user_id: user.id,
        company_name: company.trim(),
        role_title: role.trim(),
        source_url: url.trim() || null,
        deadline_at: deadlineVal ? new Date(deadlineVal).toISOString() : null,
        description_text: description || draft?.description_text || null,
        location: fullLocation,
        salary_min: draft?.salary_min ?? null,
        salary_max: draft?.salary_max ?? null,
        currency: draft?.currency ?? 'IDR',
      })
      .select('id')
      .single();

    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }

    if (draft?.requirements.length) {
      const r = await db.from('job_requirements').insert(
        draft.requirements
          .filter((x) => x.skill_name.trim())
          .map((x) => ({
            job_id: data.id,
            user_id: user.id,
            skill_name: x.skill_name.trim(),
            kind: x.kind,
            source_excerpt: x.source_excerpt,
            confirmed_by_user: true,
          }))
      );
      if (r.error) setMessage('Lowongan tersimpan, namun beberapa persyaratan gagal: ' + r.error.message);
    }

    setSelectedJobId(data.id);
    setCompany('');
    setRole('');
    setUrl('');
    setLocationVal('');
    setExperienceVal('');
    setDeadlineVal('');
    setEmploymentType('Full-time');
    setDescription('');
    setUploadedFile(null);
    setDraft(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setTab('detail');
    await refresh();
    setBusy(false);
  }

  async function createApplication() {
    if (!selectedJobId || !db || !user) return;
    const { data, error } = await db
      .from('applications')
      .insert({
        user_id: user.id,
        job_id: selectedJobId,
        cv_version_id: cvSelected || null,
        status: 'applied',
        applied_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }
    await db.from('application_events').insert({
      user_id: user.id,
      application_id: data.id,
      event_type: 'status',
      to_status: 'applied',
      note: 'Lamaran resmi dikirim',
    });
    await refresh();
  }

  async function changeStatus(app: Application, status: string) {
    if (!db || !user || app.status === status) return;
    const { error } = await db
      .from('applications')
      .update({ status })
      .eq('id', app.id)
      .eq('user_id', user.id);
    if (error) {
      setMessage(error.message);
      return;
    }
    await db.from('application_events').insert({
      user_id: user.id,
      application_id: app.id,
      event_type: 'status',
      from_status: app.status,
      to_status: status,
    });
    await refresh();
  }

  async function toggleSoftDelete(jobId: string, deleteIt: boolean) {
    if (!db || !user) return;
    setBusy(true);
    const { error } = await db
      .from('jobs')
      .update({ is_deleted: deleteIt })
      .eq('id', jobId)
      .eq('user_id', user.id);
    setBusy(false);
    if (error) {
      setMessage('Gagal memperbarui status lowongan: ' + error.message);
    } else {
      setMessage(
        deleteIt
          ? '🗑️ Lowongan berhasil diarsipkan (soft delete). Aktifkan toggle Eyes Off di pojok kanan untuk melihatnya kembali.'
          : '✅ Lowongan berhasil dipulihkan ke daftar aktif!'
      );
      await refresh();
    }
  }

  async function addAction(appId: string) {
    if (!actionTitle.trim() || !actionDue) {
      setMessage('Isi judul tindakan dan tenggat waktu.');
      return;
    }
    if (
      await save('actions', {
        application_id: appId,
        title: actionTitle.trim(),
        due_at: new Date(actionDue).toISOString(),
      })
    ) {
      setActionTitle('');
      setActionDue('');
    }
  }

  async function addNote(appId: string) {
    if (!note.trim() || !db || !user) return;
    const { data, error } = await db
      .from('application_events')
      .insert({
        user_id: user.id,
        application_id: appId,
        event_type: noteType,
        note: note.trim(),
      })
      .select('*')
      .single();
    if (error) {
      setMessage(error.message);
      return;
    }
    setEvents((old) => [data as Event, ...old]);
    setNote('');
  }

  const currentJob = jobs.find((j) => j.id === selectedJobId);
  const currentApp = apps.filter((a) => a.job_id === selectedJobId).at(-1);
  const evaluationResult = useMemo(
    () => evaluateRequirements(reqs, skills),
    [reqs, skills]
  );

  const filteredJobs = useMemo(
    () =>
      jobs
        .filter((j) => (showDeleted ? true : !j.is_deleted))
        .filter((j) =>
          (j.company_name + ' ' + j.role_title + ' ' + (j.location || '')).toLowerCase().includes(search.toLowerCase())
        ),
    [jobs, search, showDeleted]
  );

  const now = new Date().toISOString();
  const pendingActions = useMemo(
    () => actions.filter((a) => !a.completed_at).sort((a, b) => a.due_at.localeCompare(b.due_at)),
    [actions]
  );

  if (!db) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <h1>Career Tracker</h1>
          <p>{message || 'Menghubungkan ke server...'}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <span className="brand-badge">Personal Edition</span>
          <h1>Career Tracker</h1>
          <p>Simpan lowongan, evaluasi kecocokan skill, review CV dengan AI, dan kelola timeline lamaran Anda.</p>

          <label>
            Email
            <input
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <div className="row" style={{ marginTop: '1.25rem' }}>
            <button style={{ flex: 1 }} disabled={busy} onClick={() => authenticate()}>
              Masuk
            </button>
            <button
              style={{ flex: 1 }}
              disabled={busy}
              className="secondary"
              onClick={() => authenticate(true)}
            >
              Daftar Akun
            </button>
          </div>

          {message && (
            <p style={{ marginTop: '1rem', color: '#38bdf8', fontSize: '0.85rem' }} role="status">
              {message}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <main className="shell">
      <header>
        <div>
          <span className="brand-badge">Personal Career Tracker</span>
          <h1>Halo, {user.email?.split('@')[0]}</h1>
        </div>
        <button className="secondary" onClick={() => db.auth.signOut()}>
          Keluar
        </button>
      </header>

      <nav>
        {[
          ['dashboard', '📊 Dashboard'],
          ['jobs', '💼 Daftar Lowongan'],
          ['new', '➕ Tambah Lowongan'],
          ['skills', '⚡ Profil Skill'],
          ['cv', '📄 Versi CV'],
        ].map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? 'active' : ''}
            onClick={() => setTab(id as typeof tab)}
          >
            {label}
          </button>
        ))}
      </nav>

      {message && (
        <div className="notice" role="status" onClick={() => setMessage('')}>
          <span>{message}</span>
          <span style={{ fontSize: '1.2rem', cursor: 'pointer' }}>×</span>
        </div>
      )}

      {/* 1. DASHBOARD */}
      {tab === 'dashboard' && (
        <>
          <section className="grid stats">
            <div className="stat-box primary">
              <small>Applications</small>
              <strong>{apps.filter((a) => a.applied_at).length}</strong>
            </div>
            <div className="stat-box blue">
              <small>Screening</small>
              <strong>{apps.filter((a) => a.status === 'screening').length}</strong>
            </div>
            <div className="stat-box purple">
              <small>Interview</small>
              <strong>{apps.filter((a) => a.status === 'interview').length}</strong>
            </div>
            <div className="stat-box amber">
              <small>Technical Test</small>
              <strong>{apps.filter((a) => a.status === 'technical_test').length}</strong>
            </div>
            <div className="stat-box primary">
              <small>Offers</small>
              <strong>{apps.filter((a) => a.status === 'offer').length}</strong>
            </div>
            <div className="stat-box rose">
              <small>Rejected</small>
              <strong>{apps.filter((a) => a.status === 'rejected').length}</strong>
            </div>
          </section>

          <div className="columns">
            <section className="card">
              <h2>📅 Tindakan Berikutnya (Next Actions)</h2>
              {pendingActions.length > 0 ? (
                pendingActions.map((a) => {
                  const isOverdue = a.due_at < now;
                  const relatedJob = jobs.find(
                    (j) => apps.find((ap) => ap.id === a.application_id)?.job_id === j.id
                  );
                  return (
                    <div className="list-item" key={a.id}>
                      <div className="list-item-content">
                        <b>{a.title}</b>
                        <p style={{ color: isOverdue ? 'var(--accent-rose)' : 'inherit' }}>
                          {isOverdue ? '⚠️ TERLAMBAT · ' : '⏰ '}
                          {new Date(a.due_at).toLocaleString('id-ID', {
                            timeZone: 'Asia/Jakarta',
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                          {relatedJob && ` · ${relatedJob.company_name}`}
                        </p>
                      </div>
                      <button
                        className="secondary"
                        onClick={async () => {
                          await db
                            .from('actions')
                            .update({ completed_at: new Date().toISOString() })
                            .eq('id', a.id);
                          await refresh();
                        }}
                      >
                        ✓ Selesai
                      </button>
                    </div>
                  );
                })
              ) : (
                <p>Belum ada jadwal tindakan mendatang.</p>
              )}
            </section>

            <section className="card">
              <h2>💼 Lowongan Terbaru</h2>
              {jobs.filter((j) => !j.is_deleted).slice(0, 5).map((j) => {
                const latestApp = apps.filter((a) => a.job_id === j.id).at(-1);
                return (
                  <div className="list-item" key={j.id}>
                    <div className="list-item-content">
                      <b>{j.company_name}</b>
                      <p>{j.role_title}</p>
                      {latestApp && (
                        <span className={`badge badge-${latestApp.status}`}>
                          {STAGE_NAMES[latestApp.status]}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedJobId(j.id);
                        setTab('detail');
                      }}
                    >
                      Buka
                    </button>
                  </div>
                );
              })}
              {!jobs.length && <p>Belum ada data lowongan tersimpan.</p>}
            </section>
          </div>
        </>
      )}

      {/* 2. DAFTAR LOWONGAN */}
      {tab === 'jobs' && (
        <section className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ margin: 0 }}>Daftar Lowongan</h2>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {showDeleted
                  ? `Mode Eyes Off: Menampilkan semua (${filteredJobs.length}) lowongan, termasuk yang di-soft delete.`
                  : `Mode Eyes: Menampilkan ${filteredJobs.length} lowongan aktif.`}
              </p>
            </div>

            {/* Toggle Eyes / Eyes Off di Pojok Kanan */}
            <button
              type="button"
              className="secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.55rem',
                padding: '0.55rem 1rem',
                fontSize: '0.88rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: showDeleted ? '1px solid var(--accent-amber)' : '1px solid var(--brand-primary)',
                background: showDeleted ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                color: showDeleted ? '#fbbf24' : '#34d399',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              title={
                showDeleted
                  ? 'Klik untuk kembali ke Mode Eyes (Hanya lowongan aktif)'
                  : 'Klik untuk beralih ke Mode Eyes Off (Tampilkan semua termasuk yang dihapus)'
              }
              onClick={() => setShowDeleted(!showDeleted)}
            >
              {showDeleted ? (
                <>
                  <span style={{ fontSize: '1.2rem' }}>🙈</span>
                  <span>Eyes Off (Semua + Terhapus)</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '1.2rem' }}>👁️</span>
                  <span>Eyes (Hanya Aktif)</span>
                </>
              )}
            </button>
          </div>

          <input
            placeholder="🔍 Cari berdasarkan nama perusahaan atau posisi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: '1.25rem' }}
          />

          {filteredJobs.map((j) => {
            const latestApp = apps.filter((a) => a.job_id === j.id).at(-1);
            const isSoftDeleted = !!j.is_deleted;

            return (
              <div
                className="list-item"
                key={j.id}
                style={{
                  opacity: isSoftDeleted ? 0.72 : 1,
                  borderLeft: isSoftDeleted ? '4px solid var(--accent-rose)' : undefined,
                  background: isSoftDeleted ? 'rgba(244, 63, 94, 0.04)' : undefined,
                  transition: 'all 0.2s ease',
                }}
              >
                <div className="list-item-content">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <b style={{ textDecoration: isSoftDeleted ? 'line-through' : 'none' }}>
                      {j.company_name}
                    </b>
                    {' — '}
                    <span style={{ color: isSoftDeleted ? 'var(--text-muted)' : '#fff' }}>
                      {j.role_title}
                    </span>

                    {isSoftDeleted && (
                      <span
                        className="badge"
                        style={{
                          background: 'rgba(244, 63, 94, 0.18)',
                          color: '#fb7185',
                          border: '1px solid rgba(244, 63, 94, 0.3)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                        }}
                      >
                        🗑️ Soft Deleted (Arsip)
                      </span>
                    )}
                  </div>

                  <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={`badge badge-${latestApp?.status ?? 'saved'}`}>
                      {STAGE_NAMES[latestApp?.status ?? 'saved']}
                    </span>
                    {j.location && <small>📍 {j.location}</small>}
                    {j.created_at && (
                      <small style={{ color: 'var(--text-muted)' }}>
                        🕒 {new Date(j.created_at).toLocaleDateString('id-ID')}
                      </small>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      setSelectedJobId(j.id);
                      setTab('detail');
                    }}
                  >
                    Lihat Detail →
                  </button>

                  {isSoftDeleted ? (
                    <button
                      type="button"
                      className="secondary"
                      style={{
                        padding: '0.5rem 0.85rem',
                        fontSize: '0.82rem',
                        borderColor: 'var(--brand-primary)',
                        color: 'var(--brand-primary-text)',
                      }}
                      title="Pulihkan lowongan ini ke daftar aktif"
                      onClick={() => toggleSoftDelete(j.id, false)}
                    >
                      ♻️ Pulihkan
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="danger"
                      style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem' }}
                      title="Hapus lowongan ini (Soft Delete)"
                      onClick={() => {
                        if (
                          confirm(
                            `Arsipkan/hapus (soft delete) lowongan "${j.company_name} - ${j.role_title}"?\n\nLowongan tidak dihapus permanen dan tetap bisa dilihat atau dipulihkan kembali melalui tombol toggle Eyes Off di pojok kanan.`
                          )
                        ) {
                          toggleSoftDelete(j.id, true);
                        }
                      }}
                    >
                      🗑️ Hapus
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {!filteredJobs.length && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>Tidak ditemukan lowongan yang sesuai.</p>
              {!showDeleted && jobs.some((j) => j.is_deleted) && (
                <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--accent-amber)' }}>
                  💡 Ada lowongan yang sedang diarsipkan. Klik tombol <b>"Eyes (Hanya Aktif)"</b> di pojok kanan atas untuk beralih ke <b>"Eyes Off"</b> dan melihat lowongan yang dihapus.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* 3. TAMBAH LOWONGAN & AI MULTIMODAL DRAFT */}
      {tab === 'new' && (
        <section className="card">
          <h2>Tambah Lowongan Baru</h2>
          <p style={{ marginBottom: '1.25rem' }}>
            Anda dapat <b>mengunggah file/gambar (screenshot) lowongan</b> atau <b>menempel teks job description</b>. 
            AI Gemini akan membaca nama perusahaan, posisi, status kerja, lokasi, link referensi, pengalaman, tanggal deadline, serta deskripsi lengkap dan skill secara otomatis.
          </p>

          {/* Upload File / Gambar Box */}
          <div
            style={{
              border: '2px dashed var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem',
              textAlign: 'center',
              background: 'var(--bg-surface-elevated)',
              marginBottom: '1.25rem',
              cursor: 'pointer',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📎 / 📋 / 🖼️</div>
            <b>Klik Upload File/Gambar, Drag & Drop, atau Cukup Paste (Ctrl + V) Langsung</b>
            <p style={{ fontSize: '0.85rem', marginTop: '0.35rem', color: 'var(--brand-primary-text)' }}>
              ⚡ Anda bisa capture screenshot lowongan (Win + Shift + S) lalu langsung tekan <b>Ctrl + V</b> di halaman ini
            </p>

            {uploadedFile && (
              <div
                style={{
                  marginTop: '1rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {uploadedFile.previewUrl && (
                  <img
                    src={uploadedFile.previewUrl}
                    alt="Preview"
                    style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                  />
                )}
                <span style={{ color: '#34d399', fontSize: '0.9rem', fontWeight: 600 }}>
                  📄 {uploadedFile.name}
                </span>
                <button
                  className="danger"
                  style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={() => {
                    setUploadedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  Hapus
                </button>
              </div>
            )}
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <button
              disabled={busy || (!description.trim() && !uploadedFile)}
              onClick={extract}
              style={{ width: '100%', padding: '0.85rem 1.25rem', fontSize: '1rem' }}
            >
              {busy ? '⏳ Sedang Memproses AI...' : '✨ Ekstrak & Analisis dengan Gemini AI'}
            </button>
          </div>

          <label>
            Job Description (Teks Lengkap)
            <textarea
              rows={7}
              placeholder="Tempel teks deskripsi lowongan di sini (atau biarkan AI yang mengisi otomatis setelah membaca gambar/file di atas)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <hr style={{ margin: '1.25rem 0 1.5rem 0', borderColor: 'var(--border-subtle)' }} />

          <h3>📝 Informasi Lowongan (Dapat Diedit Manual)</h3>
          
          {/* Baris 1: Nama Perusahaan, Posisi, Status Pekerjaan, Lokasi Kerja */}
          <div className="formgrid">
            <label>
              Nama Perusahaan *
              <input
                placeholder="Contoh: PT Teknologi Indonesia"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </label>
            <label>
              Posisi / Jabatan *
              <input
                placeholder="Contoh: Senior Backend Engineer"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            </label>
            <label>
              Status Pekerjaan
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
              >
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Lokasi Kerja (Remote/Hybrid/Kota)
              <input
                placeholder="Contoh: Purwokerto, Jawa Tengah"
                value={locationVal}
                onChange={(e) => setLocationVal(e.target.value)}
              />
            </label>
          </div>

          {/* Baris 2: Link Referensi, Pengalaman, dan Tanggal Deadline */}
          <div className="formgrid" style={{ marginTop: '0.5rem' }}>
            <label style={{ gridColumn: 'span 2' }}>
              Link Referensi Lowongan (Opsional)
              <input
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </label>
            <label>
              Pengalaman (Opsional)
              <input
                placeholder="Contoh: Min. 2 Tahun / Fresh Graduate"
                value={experienceVal}
                onChange={(e) => setExperienceVal(e.target.value)}
              />
            </label>
            <label>
              Tanggal Deadline (Opsional)
              <input
                type="date"
                value={deadlineVal}
                onChange={(e) => setDeadlineVal(e.target.value)}
              />
            </label>
          </div>

          {draft && (
            <div style={{ marginTop: '1.75rem' }}>
              <h3>🎯 Konfirmasi Persyaratan Keterampilan (Draft AI)</h3>
              <p style={{ marginBottom: '0.75rem' }}>
                Koreksi nama skill dan klasifikasinya (Wajib / Tambahan) sesuai teks sumber.
              </p>
              {draft.requirements.map((r, i) => (
                <div className="reqedit" key={i}>
                  <input
                    aria-label="Skill"
                    placeholder="Nama Skill"
                    value={r.skill_name}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        requirements: draft.requirements.map((item, n) =>
                          n === i ? { ...item, skill_name: e.target.value } : item
                        ),
                      })
                    }
                  />
                  <select
                    value={r.kind}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        requirements: draft.requirements.map((item, n) =>
                          n === i ? { ...item, kind: e.target.value as Requirement['kind'] } : item
                        ),
                      })
                    }
                  >
                    <option value="required">Wajib (Required)</option>
                    <option value="preferred">Tambahan (Preferred)</option>
                  </select>
                  <button
                    className="danger"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        requirements: draft.requirements.filter((_, n) => n !== i),
                      })
                    }
                  >
                    Hapus
                  </button>
                  {r.source_excerpt && <small>Kutipan: "{r.source_excerpt}"</small>}
                </div>
              ))}
              <button
                className="secondary"
                style={{ marginTop: '0.5rem' }}
                onClick={() =>
                  setDraft({
                    ...draft,
                    requirements: [
                      ...draft.requirements,
                      { skill_name: '', kind: 'required', source_excerpt: 'Ditambahkan manual' },
                    ],
                  })
                }
              >
                + Tambah Persyaratan Manual
              </button>
            </div>
          )}

          <hr style={{ margin: '1.75rem 0', borderColor: 'var(--border-subtle)' }} />
          <button disabled={busy} onClick={createJob}>
            💾 Simpan Lowongan
          </button>
        </section>
      )}

      {/* 4. PROFIL SKILL */}
      {tab === 'skills' && (
        <section className="card">
          <h2>⚡ Profil Keterampilan (User Skills)</h2>
          <p style={{ marginBottom: '1.25rem' }}>
            Kelola skill pribadi Anda beserta bukti pengalaman. Skill dengan status 'Sedang Belajar' tidak
            dihitung sebagai kecocokan otomatis pada skor lowongan.
          </p>

          <label>
            Label / Kategori Profil
            <input
              placeholder="Contoh: Profil Utama / Software Engineer"
              value={skillLabel}
              onChange={(e) => setSkillLabel(e.target.value)}
            />
          </label>

          <div className="formgrid" style={{ marginBottom: '1.25rem' }}>
            <label>
              Nama
              <input
                placeholder="Contoh: Budi Santoso"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
            </label>
            <label>
              Nomor Telepon
              <input
                placeholder="Contoh: 081234567890"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
              />
            </label>
            <label>
              Gmail
              <input
                type="email"
                placeholder="Contoh: budi.santoso@gmail.com"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
              />
            </label>
          </div>

          <div className="formgrid" style={{ marginBottom: '1.5rem' }}>
            <label>
              Nama Skill
              <input
                placeholder="Contoh: PostgreSQL, Docker, TypeScript"
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
              />
            </label>
            <label>
              Tingkat Penguasaan
              <select
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value as SkillProficiency)}
              >
                <option value="learning">Sedang Belajar (Learning)</option>
                <option value="used_in_project">Pernah Dipakai di Proyek (Used in Project)</option>
                <option value="used_at_work">Pernah Dipakai di Kerja (Used at Work)</option>
              </select>
            </label>
            <label>
              Bukti Pengalaman (Opsional)
              <input
                placeholder="Contoh: Optimasi query di project XYZ"
                value={skillEvidence}
                onChange={(e) => setSkillEvidence(e.target.value)}
              />
            </label>
          </div>

          <button
            onClick={async () => {
              if (skillName.trim()) {
                const ok = await save('user_skills', {
                  skill_name: skillName.trim(),
                  proficiency: skillLevel,
                  evidence_text: skillEvidence.trim() || null,
                });
                if (ok) {
                  setSkillName('');
                  setSkillEvidence('');
                }
              }
            }}
          >
            + Tambah Skill ke Profil
          </button>

          <div style={{ marginTop: '1.75rem' }}>
            {skills.map((s) => (
              <div className="list-item" key={s.id}>
                <div className="list-item-content">
                  <b>{s.skill_name}</b>
                  <p>
                    Tingkat: <span style={{ color: 'var(--brand-primary-text)' }}>{s.proficiency}</span>
                    {s.evidence_text && ` · Bukti: ${s.evidence_text}`}
                  </p>
                </div>
                <button
                  className="danger"
                  onClick={async () => {
                    await db.from('user_skills').delete().eq('id', s.id);
                    await refresh();
                  }}
                >
                  Hapus
                </button>
              </div>
            ))}
            {!skills.length && <p>Belum ada skill yang ditambahkan ke profil Anda.</p>}
          </div>
        </section>
      )}

      {/* 5. VERSI CV */}
      {tab === 'cv' && (
        <section className="card">
          <h2>📄 Manajemen Versi CV</h2>
          <div className="warning-box">
            <b>🛡️ Catatan Privasi (Gemini Free Tier):</b> Gunakan CV dummy atau data yang sudah dianonimkan.
            Jangan memasukkan identitas sensitif atau data rahasia perusahaan.
          </div>

          {/* 1. DAFTAR VERSI CV TERSIMPAN (DI ATAS) */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ margin: 0 }}>📚 Daftar Versi CV Tersimpan ({cvs.length})</h3>
              {editingCvId && (
                <button
                  type="button"
                  className="secondary"
                  style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
                  onClick={resetCvForm}
                >
                  ✕ Batalkan Edit
                </button>
              )}
            </div>

            {cvs.map((c) => {
              const isEditing = editingCvId === c.id;
              const isPreviewing = previewCvId === c.id;

              return (
                <div
                  key={c.id}
                  style={{
                    background: isEditing ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-surface-elevated)',
                    border: isEditing ? '2px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.1rem 1.25rem',
                    marginBottom: '0.85rem',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <b style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>{c.label}</b>
                        {isEditing && (
                          <span
                            className="badge"
                            style={{
                              background: 'var(--brand-primary)',
                              color: '#042419',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              padding: '0.15rem 0.55rem',
                            }}
                          >
                            ✏️ Sedang Diedit
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        📅 Dibuat pada: {new Date(c.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        {' • '}
                        {c.content_text.length} karakter
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="secondary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.83rem' }}
                        onClick={() => setPreviewCvId(isPreviewing ? null : c.id)}
                      >
                        {isPreviewing ? '✕ Tutup Intip' : '👁️ Lihat Isi'}
                      </button>

                      <button
                        type="button"
                        className={isEditing ? 'secondary' : ''}
                        style={{
                          padding: '0.4rem 0.85rem',
                          fontSize: '0.83rem',
                          fontWeight: 600,
                          borderColor: isEditing ? 'var(--accent-amber)' : undefined,
                          color: isEditing ? '#fbbf24' : undefined,
                        }}
                        title="Klik untuk memuat dan mengedit seluruh data CV ini pada form di bawah"
                        onClick={() => {
                          if (isEditing) {
                            resetCvForm();
                          } else {
                            loadCvIntoForm(c);
                          }
                        }}
                      >
                        {isEditing ? '✕ Batal Edit' : '✏️ Edit di Form ↓'}
                      </button>

                      <button
                        type="button"
                        className="danger"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.83rem' }}
                        onClick={async () => {
                          if (!confirm(`Hapus versi CV "${c.label}"?`)) return;
                          if (!db) return;
                          setBusy(true);
                          const { error } = await db.from('cv_versions').delete().eq('id', c.id);
                          setBusy(false);
                          if (error) {
                            setMessage('Gagal menghapus CV: ' + error.message);
                          } else {
                            setMessage('Versi CV berhasil dihapus.');
                            if (editingCvId === c.id) resetCvForm();
                            if (previewCvId === c.id) setPreviewCvId(null);
                            await refresh();
                          }
                        }}
                      >
                        🗑️ Hapus
                      </button>
                    </div>
                  </div>

                  {/* PREVIEW VIEW */}
                  {isPreviewing && (
                    <div
                      style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        whiteSpace: 'pre-wrap',
                        fontSize: '0.9rem',
                        lineHeight: 1.6,
                        maxHeight: '320px',
                        overflowY: 'auto',
                      }}
                    >
                      {c.content_text}
                    </div>
                  )}
                </div>
              );
            })}
            {!cvs.length && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Belum ada versi CV tersimpan. Silakan isi form di bawah untuk membuat versi CV pertama Anda.
              </p>
            )}
          </div>

          <hr style={{ margin: '2rem 0 1.5rem', borderColor: 'var(--border-subtle)' }} />

          {/* 2. FORM INPUT & EDIT CV (DI BAWAH) */}
          <div ref={cvFormRef}>
            {editingCvId ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid var(--brand-primary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1.25rem',
                  marginBottom: '1.25rem',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <b style={{ color: 'var(--brand-primary-text)', fontSize: '1rem' }}>
                    ✏️ Mode Edit: Mengubah Versi CV "{cvLabel}"
                  </b>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Ubah data pada kolom di bawah ini. Klik tombol <b>"💾 Perbarui Versi CV"</b> untuk memperbarui database.
                  </p>
                </div>
                <button
                  type="button"
                  className="secondary"
                  style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
                  onClick={resetCvForm}
                >
                  ✕ Batal Edit (Buat Baru)
                </button>
              </div>
            ) : (
              <h3 style={{ marginBottom: '1rem' }}>➕ Buat / Tambah Versi CV Baru</h3>
            )}

            {/* Upload File CV Box */}
            <div
              style={{
                border: '2px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.5rem',
                textAlign: 'center',
                background: 'var(--bg-surface-elevated)',
                marginBottom: '1.25rem',
                cursor: 'pointer',
              }}
              onClick={() => cvFileInputRef.current?.click()}
            >
              <input
                ref={cvFileInputRef}
                type="file"
                accept="application/pdf,image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) processCvFile(file);
                }}
              />
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄 / 📋 / 🖼️</div>
              <b>Upload File CV (PDF / Gambar) atau Cukup Paste (Ctrl + V)</b>
              <p style={{ fontSize: '0.85rem', marginTop: '0.35rem', color: 'var(--brand-primary-text)' }}>
                ⚡ AI Gemini akan membaca seluruh teks CV dan mengisi form di bawah secara otomatis
              </p>

              {uploadedCvFile && (
                <div
                  style={{
                    marginTop: '1rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {uploadedCvFile.previewUrl && (
                    <img
                      src={uploadedCvFile.previewUrl}
                      alt="Preview"
                      style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                  )}
                  <span style={{ color: '#34d399', fontSize: '0.9rem', fontWeight: 600 }}>
                    📄 {uploadedCvFile.name}
                  </span>
                  <button
                    className="danger"
                    style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                    onClick={() => {
                      setUploadedCvFile(null);
                      if (cvFileInputRef.current) cvFileInputRef.current.value = '';
                    }}
                  >
                    Hapus
                  </button>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <button
                disabled={busy || (!uploadedCvFile && cvText.trim().length < 15)}
                onClick={extractCvManual}
                style={{ width: '100%', padding: '0.85rem 1.25rem', fontSize: '1rem' }}
              >
                {busy ? '⏳ Sedang Memproses & Menerjemahkan CV...' : '✨ Ekstrak & Terjemahkan CV ke Bahasa Indonesia'}
              </button>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                💡 <em>Jika CV Anda berbahasa Inggris, AI akan otomatis menterjemahkan deskripsi pekerjaan, pendidikan, dan proyek ke Bahasa Indonesia tanpa mengubah nama atau istilah teknologi teknis.</em>
              </p>
            </div>

            <label>
              Label / Nama Versi CV *
              <input
                placeholder="Contoh: CV Backend v1 (Anonim)"
                value={cvLabel}
                onChange={(e) => setCvLabel(e.target.value)}
              />
            </label>

            <div className="formgrid" style={{ marginBottom: '1rem' }}>
              <label>
                Nama Lengkap
                <input
                  placeholder="Contoh: Budi Santoso"
                  value={cvFullName}
                  onChange={(e) => setCvFullName(e.target.value)}
                />
              </label>
              <label>
                Nomor Telepon / WhatsApp
                <input
                  placeholder="Contoh: 081234567890"
                  value={cvPhone}
                  onChange={(e) => setCvPhone(e.target.value)}
                />
              </label>
              <label>
                Gmail / Alamat Email
                <input
                  type="email"
                  placeholder="Contoh: budi.santoso@gmail.com"
                  value={cvEmail}
                  onChange={(e) => setCvEmail(e.target.value)}
                />
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <label>
                🏢 Pengalaman Kerja (Work Experience)
                <textarea
                  rows={8}
                  placeholder="Posisi - Nama Perusahaan (Periode)&#10;• Tanggung jawab & pencapaian 1&#10;• Tanggung jawab & pencapaian 2"
                  value={cvExperience}
                  onChange={(e) => setCvExperience(e.target.value)}
                />
              </label>

              <label>
                🎓 Riwayat Pendidikan (Education)
                <textarea
                  rows={6}
                  placeholder="Nama Universitas (Periode)&#10;• Gelar, Jurusan | IPK&#10;• Aktivitas & Prestasi"
                  value={cvEducation}
                  onChange={(e) => setCvEducation(e.target.value)}
                />
              </label>

              <label>
                🚀 Proyek & Portofolio (Projects)
                <textarea
                  rows={8}
                  placeholder="Nama Proyek (Periode)&#10;• Tech Stack: ...&#10;• Deskripsi & kontribusi"
                  value={cvProjects}
                  onChange={(e) => setCvProjects(e.target.value)}
                />
              </label>

              <label>
                👥 Organisasi & Kegiatan (Organization / Volunteer)
                <textarea
                  rows={6}
                  placeholder="Nama Organisasi (Periode)&#10;• Peran / Jabatan&#10;• Kontribusi"
                  value={cvOrganization}
                  onChange={(e) => setCvOrganization(e.target.value)}
                />
              </label>
            </div>

            <label>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span>📄 Teks Lengkap CV (Full CV Text)</span>
                {(cvExperience || cvEducation || cvProjects || cvOrganization || cvFullName) && (
                  <button
                    type="button"
                    className="secondary"
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
                    onClick={() => {
                      const sections = [];
                      if (cvFullName || cvPhone || cvEmail) {
                        sections.push(`DATA PRIBADI:\n${[
                          cvFullName ? `- Nama: ${cvFullName}` : '',
                          cvPhone ? `- No. Telp/WA: ${cvPhone}` : '',
                          cvEmail ? `- Email: ${cvEmail}` : '',
                        ].filter(Boolean).join('\n')}`);
                      }
                      if (cvExperience) sections.push(`PENGALAMAN KERJA:\n${cvExperience}`);
                      if (cvEducation) sections.push(`PENDIDIKAN:\n${cvEducation}`);
                      if (cvProjects) sections.push(`PROYEK & PORTOFOLIO:\n${cvProjects}`);
                      if (cvOrganization) sections.push(`ORGANISASI:\n${cvOrganization}`);
                      setCvText(sections.join('\n\n'));
                    }}
                  >
                    🔄 Sinkronkan dari Kolom di Atas
                  </button>
                )}
              </div>
              <textarea
                rows={10}
                placeholder="Tempel isi teks CV dummy/anonim Anda di sini..."
                value={cvText}
                onChange={(e) => setCvText(e.target.value)}
              />
            </label>

            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                disabled={busy}
                onClick={async () => {
                  let finalText = cvText;
                  if (!finalText.trim()) {
                    const sections = [];
                    if (cvFullName || cvPhone || cvEmail) {
                      sections.push(`DATA PRIBADI:\n${[
                        cvFullName ? `- Nama: ${cvFullName}` : '',
                        cvPhone ? `- No. Telp/WA: ${cvPhone}` : '',
                        cvEmail ? `- Email: ${cvEmail}` : '',
                      ].filter(Boolean).join('\n')}`);
                    }
                    if (cvExperience) sections.push(`PENGALAMAN KERJA:\n${cvExperience}`);
                    if (cvEducation) sections.push(`PENDIDIKAN:\n${cvEducation}`);
                    if (cvProjects) sections.push(`PROYEK & PORTOFOLIO:\n${cvProjects}`);
                    if (cvOrganization) sections.push(`ORGANISASI:\n${cvOrganization}`);
                    finalText = sections.join('\n\n');
                  }

                  if (finalText.length < 30) {
                    setMessage('Isi teks CV minimal 30 karakter.');
                    return;
                  }

                  if (!cvLabel.trim()) {
                    setMessage('Label CV tidak boleh kosong.');
                    return;
                  }

                  if (editingCvId) {
                    // UPDATE EXISTING CV
                    if (!db || !user) return;
                    setBusy(true);
                    const { error } = await db
                      .from('cv_versions')
                      .update({
                        label: cvLabel.trim(),
                        content_text: finalText,
                      })
                      .eq('id', editingCvId)
                      .eq('user_id', user.id);
                    setBusy(false);

                    if (error) {
                      setMessage('Gagal memperbarui CV: ' + error.message);
                    } else {
                      setMessage(`✅ Versi CV "${cvLabel}" berhasil diperbarui!`);
                      resetCvForm();
                      await refresh();
                    }
                  } else {
                    // CREATE NEW CV
                    const ok = await save('cv_versions', {
                      label: cvLabel.trim(),
                      content_text: finalText,
                    });
                    if (ok) {
                      resetCvForm();
                    }
                  }
                }}
              >
                {editingCvId ? '💾 Perbarui Versi CV (Simpan Perubahan)' : '💾 Simpan Versi CV Baru'}
              </button>

              {editingCvId && (
                <button
                  type="button"
                  className="secondary"
                  onClick={resetCvForm}
                >
                  ✕ Batalkan Edit
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 6. DETAIL LOWONGAN & TRACKING WORKFLOW */}
      {tab === 'detail' && currentJob && (
        <>
          <section className="card" style={{ marginBottom: '1.25rem' }}>
            <button className="secondary" style={{ marginBottom: '1rem' }} onClick={() => setTab('jobs')}>
              ← Kembali ke Daftar Lowongan
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2>{currentJob.company_name}</h2>
                <h3 style={{ margin: 0, color: 'var(--brand-primary-text)' }}>{currentJob.role_title}</h3>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                  {currentJob.location && <p style={{ margin: 0 }}>📍 {currentJob.location}</p>}
                  {currentJob.deadline_at && (
                    <p style={{ margin: 0, color: 'var(--accent-amber)' }}>
                      ⏳ Deadline: {new Date(currentJob.deadline_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  )}
                </div>
              </div>
              {currentJob.source_url && (
                <a
                  href={currentJob.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn secondary"
                >
                  Kunjungi Link Sumber ↗
                </a>
              )}
            </div>

            {currentJob.description_text && (
              <div style={{ marginTop: '1.25rem' }}>
                <p style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  Deskripsi Lowongan:
                </p>
                <div
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    fontSize: '0.9rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  {currentJob.description_text}
                </div>
              </div>
            )}

            {/* Skor Kecocokan Transparan */}
            <div className="score-card">
              <div className="score-display">
                <div className="score-number">
                  {evaluationResult.scorePercent === null ? 'N/A' : `${evaluationResult.scorePercent}%`}
                </div>
                <div>
                  <b style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>
                    Skor Kecocokan Persyaratan Wajib
                  </b>
                  <div className="score-meta">
                    {evaluationResult.matchedCount} dari {evaluationResult.totalRequiredCount} persyaratan
                    wajib cocok dengan profil skill Anda.
                  </div>
                </div>
              </div>
              <small style={{ marginTop: '0.5rem', display: 'block' }}>
                ℹ️ Skor ini menggambarkan kesesuaian profil terhadap daftar syarat terkonfirmasi, bukan
                prediksi/peluang diterima kerja.
              </small>
            </div>

            {/* List Persyaratan & Detail Status */}
            <h3>Daftar Persyaratan & Status Kecocokan:</h3>
            <div style={{ marginTop: '0.75rem' }}>
              {evaluationResult.evaluations.map((ev, i) => (
                <div className="list-item" key={i}>
                  <div className="list-item-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span className={`badge badge-match-${ev.status}`}>
                        {ev.status === 'verified_match'
                          ? '✓ Cocok Terverifikasi'
                          : ev.status === 'needs_confirmation'
                          ? '⚠️ Sedang Dipelajari'
                          : '✕ Belum Ada di Profil'}
                      </span>
                      <b>{ev.requirement.skill_name}</b>
                      <small>({ev.requirement.kind === 'required' ? 'Wajib' : 'Tambahan/Preferred'})</small>
                    </div>
                    {ev.requirement.source_excerpt && (
                      <p style={{ fontStyle: 'italic', marginTop: '0.3rem' }}>
                        "{ev.requirement.source_excerpt}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {!evaluationResult.evaluations.length && (
                <p>Tidak ada persyaratan khusus yang dicatat untuk lowongan ini.</p>
              )}
            </div>
          </section>

          {/* Workflow Kolom Kiri: Lamaran & Timeline | Kolom Kanan: AI CV Review */}
          <div className="columns">
            <section className="card">
              <h2>📋 Status & Timeline Lamaran</h2>

              {!currentApp ? (
                <div>
                  <p style={{ marginBottom: '1rem' }}>Anda belum mencatat lamaran untuk lowongan ini.</p>
                  <label>
                    Pilih Versi CV yang Digunakan
                    <select value={cvSelected} onChange={(e) => setCvSelected(e.target.value)}>
                      <option value="">Tanpa Versi CV</option>
                      {cvs.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button onClick={createApplication}>🚀 Catat Sudah Melamar</button>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <p style={{ marginBottom: '0.35rem' }}>Status Terkini:</p>
                    <span className={`badge badge-${currentApp.status}`} style={{ fontSize: '0.95rem' }}>
                      {STAGE_NAMES[currentApp.status]}
                    </span>
                  </div>

                  <label>
                    Perbarui Status Tahapan
                    <select
                      value={currentApp.status}
                      onChange={(e) => changeStatus(currentApp, e.target.value)}
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>
                          {STAGE_NAMES[s]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <p style={{ fontSize: '0.88rem', margin: '0.75rem 0' }}>
                    CV Terkait: {cvs.find((c) => c.id === currentApp.cv_version_id)?.label ?? 'Tidak dicatat'}
                  </p>

                  <hr style={{ margin: '1.25rem 0', borderColor: 'var(--border-subtle)' }} />

                  <h3>➕ Tambah Tindakan (Next Action)</h3>
                  <input
                    placeholder="Contoh: Follow up email HR / Persiapan tes coding"
                    value={actionTitle}
                    onChange={(e) => setActionTitle(e.target.value)}
                  />
                  <input
                    type="datetime-local"
                    value={actionDue}
                    onChange={(e) => setActionDue(e.target.value)}
                    style={{ margin: '0.5rem 0' }}
                  />
                  <button onClick={() => addAction(currentApp.id)}>Simpan Jadwal Tindakan</button>

                  <hr style={{ margin: '1.25rem 0', borderColor: 'var(--border-subtle)' }} />

                  <h3>📝 Catatan & Pertanyaan Wawancara</h3>
                  <select
                    value={noteType}
                    onChange={(e) =>
                      setNoteType(e.target.value as 'note' | 'interview_note' | 'technical_question')
                    }
                  >
                    <option value="note">Catatan Umum</option>
                    <option value="interview_note">Catatan Wawancara</option>
                    <option value="technical_question">Pertanyaan Teknis</option>
                  </select>
                  <textarea
                    rows={3}
                    placeholder="Tulis catatan, feedback, atau soal tes yang ditanyakan..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    style={{ margin: '0.5rem 0' }}
                  />
                  <button onClick={() => addNote(currentApp.id)}>Tambah ke Timeline</button>

                  <div style={{ marginTop: '1.25rem' }}>
                    <h4>Riwayat Timeline:</h4>
                    {events.map((e) => (
                      <div className="list-item" key={e.id}>
                        <div className="list-item-content">
                          <small>
                            {new Date(e.occurred_at).toLocaleString('id-ID', {
                              timeZone: 'Asia/Jakarta',
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </small>
                          <p style={{ color: 'var(--text-main)', marginTop: '0.2rem' }}>
                            {e.to_status ? (
                              <span>
                                Status berubah ke <b>{STAGE_NAMES[e.to_status]}</b>
                              </span>
                            ) : (
                              <span>
                                [{e.event_type}]: {e.note}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* AI CV Review Section */}
            <section className="card">
              <h2>🤖 Review CV dengan Gemini AI</h2>
              <div className="warning-box">
                Pilih versi CV dummy/anonim untuk dibandingkan dengan deskripsi lowongan ini secara mendalam.
              </div>

              <label>
                Pilih Versi CV untuk Direview
                <select value={cvSelected} onChange={(e) => setCvSelected(e.target.value)}>
                  <option value="">-- Pilih Versi CV --</option>
                  {cvs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                disabled={busy || !cvSelected || !currentJob.description_text}
                onClick={async () => {
                  const r = await callAi('review-cv', {
                    description: currentJob.description_text,
                    cv: cvs.find((c) => c.id === cvSelected)?.content_text,
                  });
                  if (r?.review) setReview(r.review);
                }}
              >
                🔍 Mulai Review CV
              </button>

              {review && (
                <div style={{ marginTop: '1.25rem' }}>
                  <div className="ai-section">
                    <h4>✅ Bukti Relevan Ditemukan</h4>
                    <ul>
                      {review.relevant_evidence.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="ai-section">
                    <h4>⚠️ Belum Terlihat di CV</h4>
                    <ul>
                      {review.missing_from_cv.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="ai-section">
                    <h4>💡 Rekomendasi Perbaikan</h4>
                    <ul>
                      {review.suggestions.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </section>
          </div>
        </>
      )}

      <footer style={{ marginTop: '2.5rem', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '0.85rem' }}>
        Personal Job & Career Tracker MVP · Data AI selalu diperiksa & dikonfirmasi sebelum disimpan.
      </footer>
    </main>
  );
}

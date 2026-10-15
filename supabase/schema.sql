-- Jalankan sekali di SQL Editor Supabase. Semua tabel privat memakai RLS.
create extension if not exists pgcrypto;
create table if not exists public.jobs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 company_name text not null, role_title text not null, source_url text, description_text text,
 location text, salary_min numeric, salary_max numeric, currency text default 'IDR', deadline_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.job_requirements (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 job_id uuid not null references public.jobs(id) on delete cascade,
 skill_name text not null, kind text not null check (kind in ('required','preferred')),
 source_excerpt text, confirmed_by_user boolean not null default false
);
create table if not exists public.user_skills (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 skill_name text not null, proficiency text not null default 'learning' check (proficiency in ('learning','used_in_project','used_at_work')),
 evidence_text text, unique(user_id, skill_name)
);
create table if not exists public.cv_versions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 label text not null, content_text text not null, created_at timestamptz not null default now()
);
create table if not exists public.applications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 job_id uuid not null references public.jobs(id) on delete cascade, cv_version_id uuid references public.cv_versions(id) on delete set null,
 status text not null default 'saved' check (status in ('saved','applied','screening','interview','technical_test','offer','rejected','withdrawn','closed')),
 applied_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.application_events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 application_id uuid not null references public.applications(id) on delete cascade,
 event_type text not null check (event_type in ('status','interview_note','technical_question','note')),
 from_status text, to_status text, note text, occurred_at timestamptz not null default now()
);
create table if not exists public.actions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 application_id uuid not null references public.applications(id) on delete cascade,
 title text not null, due_at timestamptz not null, completed_at timestamptz
);
create index if not exists jobs_user_created_idx on public.jobs(user_id, created_at desc);
create index if not exists applications_user_status_idx on public.applications(user_id, status);
create index if not exists actions_user_due_idx on public.actions(user_id, due_at);

-- Validasi relasi lintas tabel agar user tidak menyisipkan ID data milik user lain.
create or replace function public.assert_requirement_owner() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists(select 1 from public.jobs where id = new.job_id and user_id = new.user_id) then
    raise exception 'Invalid job owner';
  end if;
  return new;
end $$;

create or replace function public.assert_application_owner() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists(select 1 from public.jobs where id = new.job_id and user_id = new.user_id) then
    raise exception 'Invalid job owner';
  end if;
  if new.cv_version_id is not null and not exists(select 1 from public.cv_versions where id = new.cv_version_id and user_id = new.user_id) then
    raise exception 'Invalid CV owner';
  end if;
  return new;
end $$;

create or replace function public.assert_app_child_owner() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists(select 1 from public.applications where id = new.application_id and user_id = new.user_id) then
    raise exception 'Invalid application owner';
  end if;
  return new;
end $$;

drop trigger if exists check_requirement_owner on public.job_requirements;
create trigger check_requirement_owner before insert or update on public.job_requirements for each row execute function public.assert_requirement_owner();

drop trigger if exists check_application_owner on public.applications;
create trigger check_application_owner before insert or update on public.applications for each row execute function public.assert_application_owner();

drop trigger if exists check_event_owner on public.application_events;
create trigger check_event_owner before insert or update on public.application_events for each row execute function public.assert_app_child_owner();

drop trigger if exists check_action_owner on public.actions;
create trigger check_action_owner before insert or update on public.actions for each row execute function public.assert_app_child_owner();

do $$ declare t text; begin
 foreach t in array array['jobs','job_requirements','user_skills','cv_versions','applications','application_events','actions'] loop
  execute format('alter table public.%I enable row level security', t);
  execute format('create policy "owner_select" on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
  execute format('create policy "owner_insert" on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t);
  execute format('create policy "owner_update" on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  execute format('create policy "owner_delete" on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t);
 end loop;
end $$;

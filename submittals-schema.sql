-- Submittals log: one row per submittal cover letter created in the app (submittal.html).
-- The merged PDF (cover letter + vendor PDFs) lives in Google Drive: NW Projects/<project>/Submittals[/<sub-folder>].
create table if not exists public.submittals (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references public.projects(id) on delete cascade,
  number           int  not null,
  revision         int  not null default 0,
  title            text not null,
  spec_section     text,
  submittal_type   text,
  action_requested text,
  manufacturer     text,
  model            text,
  description      text,
  notes            text,
  to_company       text,
  to_attention     text,
  to_email         text,
  to_address       text,
  due_date         date,
  status           text not null default 'saved',     -- saved | sent | approved | approved-as-noted | revise-resubmit | rejected
  sent_to          text,
  sent_at          timestamptz,
  drive_id         text,
  drive_url        text,
  file_name        text,
  drive_folder     text,
  created_by       uuid references public.profiles(id) on delete set null,
  created_by_name  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (project_id, number, revision)
);
create index if not exists idx_submittals_project on public.submittals(project_id);

alter table public.submittals enable row level security;
drop policy if exists submittals_read on public.submittals;
create policy submittals_read on public.submittals for select to authenticated using (true);
drop policy if exists submittals_write on public.submittals;
create policy submittals_write on public.submittals for all to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['admin','manager','lead_pm','project_manager','apm'])))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['admin','manager','lead_pm','project_manager','apm'])));

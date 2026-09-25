-- 2026-09-25: the submittals log also holds O&M / IOM manuals and Warranty letters (kind), numbered per kind.
alter table public.submittals add column if not exists kind text not null default 'submittal';   -- submittal | iom | warranty
alter table public.submittals add column if not exists data jsonb;                                -- warranty letter fields
do $$ declare c text; begin
  for c in select conname from pg_constraint where conrelid = 'public.submittals'::regclass and contype = 'u' loop
    execute format('alter table public.submittals drop constraint %I', c);
  end loop;
end $$;
alter table public.submittals add constraint submittals_kind_number_key unique (project_id, kind, number, revision);

-- Office-only assets (e.g. the General Manager's signature for warranty letters). Never readable by technicians.
create table if not exists public.app_assets (
  key        text primary key,
  mime       text not null default 'image/png',
  data       text not null,              -- base64
  updated_at timestamptz not null default now()
);
alter table public.app_assets enable row level security;
drop policy if exists app_assets_office on public.app_assets;
create policy app_assets_office on public.app_assets for all to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['admin','manager','lead_pm','project_manager','apm'])))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['admin','manager','lead_pm','project_manager','apm'])));

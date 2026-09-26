-- 2026-09-26: AI Estimator — one session per bid. Upload drawings/specs/addenda/quotes, every sheet is read by Claude
-- (Edge Function "ai-estimator"), then the pricing engine (est-engine.js) builds the cost breakdown from NWAC standards.
-- Office roles only.

create table if not exists public.ai_est_sessions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  location    text,
  floors      int,
  area_sf     numeric,
  status      text not null default 'new',            -- new | reading | ready | priced
  model       text not null default 'claude-sonnet-5',
  estimate_id uuid,                                    -- estimate created from this session
  result      jsonb,                                   -- engine output + AI scope review
  notes       text,
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.ai_est_files (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.ai_est_sessions(id) on delete cascade,
  kind         text not null default 'drawings',       -- drawings | specs | addendum | rfi | quote | other
  file_name    text not null,
  storage_path text,
  pages        int,
  size         bigint,
  created_at   timestamptz not null default now()
);

create table if not exists public.ai_est_pages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.ai_est_sessions(id) on delete cascade,
  file_id     uuid not null references public.ai_est_files(id) on delete cascade,
  page_no     int not null,
  sheet_no    text,
  sheet_title text,
  sheet_type  text,
  text_len    int,
  tag_counts  jsonb,                                   -- tags counted from the PDF text layer (exact)
  status      text not null default 'pending',         -- pending | running | done | error
  result      jsonb,                                   -- what Claude read on the sheet
  error       text,
  model       text,
  tokens_in   int,
  tokens_out  int,
  cost        numeric(10,4),
  started_at  timestamptz,
  finished_at timestamptz,
  unique (file_id, page_no)
);
create index if not exists ai_est_pages_session on public.ai_est_pages(session_id);

do $$
declare t text;
begin
  foreach t in array array['ai_est_sessions','ai_est_files','ai_est_pages'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_office', t);
    execute format($p$create policy %I on public.%I for all to authenticated
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager','lead_pm','project_manager','apm')))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager','lead_pm','project_manager','apm')))$p$, t || '_office', t);
  end loop;
end $$;

-- private bucket for the uploaded bid documents
insert into storage.buckets (id, name, public) values ('ai-estimator', 'ai-estimator', false) on conflict (id) do nothing;
drop policy if exists ai_estimator_office on storage.objects;
create policy ai_estimator_office on storage.objects for all to authenticated
  using (bucket_id = 'ai-estimator' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager','lead_pm','project_manager','apm')))
  with check (bucket_id = 'ai-estimator' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager','lead_pm','project_manager','apm')));

-- Duct / pipe unit norms mined from NWAC's Procore estimates (median unit cost + labor per item/size)
create table if not exists public.est_norms (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null,          -- duct | pipe | fitting | insulation | other
  item        text not null,          -- normalized item name as used in Procore
  unit        text,
  unit_cost   numeric(12,4),          -- median material $/unit
  labor_hrs   numeric(12,5),          -- median labor hours/unit
  samples     int,
  projects    int,
  p25_cost numeric(12,4), p75_cost numeric(12,4), p25_hrs numeric(12,5), p75_hrs numeric(12,5),
  source      text default 'procore',
  updated_at  timestamptz not null default now(),
  unique (kind, item, unit)
);
alter table public.est_norms enable row level security;
drop policy if exists est_norms_office on public.est_norms;
create policy est_norms_office on public.est_norms for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager','lead_pm','project_manager','apm')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager','lead_pm','project_manager','apm')));

select 'ok' as ai_estimator_schema;

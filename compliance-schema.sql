-- ============================================================================
-- Subs & Vendors compliance (2026-10-21, Russ): COI / MSA / W-9 register for every company that works for NWAC,
-- expiry reminders to the office (Karen) 30 days ahead, request-an-update e-mails from the app.
--   compliance_parties   — one row per company (seeded from subcontractors + vendors, linked by id)
--   compliance_docs      — every document received (COI, MSA, W-9, licence, WC / DBL certificates …), file in Drive
--   compliance_reminders — what was sent when (expiry digests and update requests); unique per doc/kind/expiry date
--   compliance_settings  — single row: who gets the reminders, lead days, NWAC's insurance requirements
-- ============================================================================

create table if not exists public.compliance_parties (
  id                uuid primary key default gen_random_uuid(),
  kind              text not null default 'subcontractor' check (kind in ('subcontractor','vendor','consultant','other')),
  name              text not null,
  subcontractor_id  uuid unique references public.subcontractors(id) on delete set null,
  vendor_id         uuid unique references public.vendors(id) on delete set null,
  trade             text,
  contact_name      text,
  email             text,                 -- where COI / MSA requests go
  cc_emails         text,                 -- comma separated (their insurance broker, office …)
  phone             text,
  address           text,
  coi_required      boolean not null default true,
  msa_required      boolean not null default true,
  w9_required       boolean not null default true,
  is_active         boolean not null default true,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create unique index if not exists uq_compliance_parties_name on public.compliance_parties (lower(name));

create table if not exists public.compliance_docs (
  id                   uuid primary key default gen_random_uuid(),
  party_id             uuid not null references public.compliance_parties(id) on delete cascade,
  doc_type             text not null check (doc_type in ('coi','msa','w9','license','workers_comp','disability','other')),
  title                text,
  status               text not null default 'received' check (status in ('received','approved','rejected','superseded')),
  effective_date       date,
  expiration_date      date,                -- earliest expiry on the document (COI: the first policy to lapse)
  signed_date          date,                -- MSA / W-9
  insurer              text,
  policy_numbers       text,
  gl_occurrence        numeric(14,2),
  gl_aggregate         numeric(14,2),
  auto_limit           numeric(14,2),
  umbrella_limit       numeric(14,2),
  wc_included          boolean,
  dbl_included         boolean,
  additional_insured   boolean,
  waiver_subrogation   boolean,
  primary_noncontrib   boolean,
  holder_ok            boolean,
  review_notes         text,
  reviewed_by          uuid references public.profiles(id) on delete set null,
  reviewed_by_name     text,
  reviewed_at          timestamptz,
  file_name            text,
  drive_id             text,
  drive_url            text,
  ai_extracted         jsonb,
  created_by           uuid references public.profiles(id) on delete set null,
  created_by_name      text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists idx_compliance_docs_party on public.compliance_docs (party_id, doc_type, created_at desc);
create index if not exists idx_compliance_docs_exp   on public.compliance_docs (expiration_date) where status in ('received','approved');

create table if not exists public.compliance_reminders (
  id            uuid primary key default gen_random_uuid(),
  party_id      uuid references public.compliance_parties(id) on delete cascade,
  doc_id        uuid references public.compliance_docs(id) on delete cascade,
  kind          text not null check (kind in ('expiring','expired','request_sent')),
  for_date      date,                        -- the expiry date the digest was about (null for requests)
  sent_to       text,
  subject       text,
  sent_by       uuid references public.profiles(id) on delete set null,
  sent_by_name  text,
  created_at    timestamptz not null default now(),
  unique (doc_id, kind, for_date)            -- one expiring + one expired digest per document per expiry date
);
create index if not exists idx_compliance_reminders_party on public.compliance_reminders (party_id, created_at desc);

create table if not exists public.compliance_settings (
  id            int primary key default 1 check (id = 1),
  notify_emails text not null default 'karen@northernwolvesac.com',
  lead_days     int  not null default 30,
  requirements  jsonb not null default '{
    "gl_occurrence": 1000000, "gl_aggregate": 2000000, "auto_limit": 1000000, "umbrella_limit": 5000000,
    "wc": true, "dbl": true, "additional_insured": true, "waiver_subrogation": true, "primary_noncontrib": true,
    "holder": "Northern Wolves, Inc., 55 9th Street, Unit 55A-2, Brooklyn, NY 11215",
    "notes": "Additional insured on a primary and non-contributory basis: Northern Wolves, Inc. and every party required by the project contract (GC, owner, landlord). Waiver of subrogation in favor of the same parties."
  }'::jsonb,
  updated_at    timestamptz not null default now()
);
insert into public.compliance_settings (id) values (1) on conflict (id) do nothing;

-- touch triggers
create or replace function public.fn_compliance_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists trg_compliance_parties_touch on public.compliance_parties;
create trigger trg_compliance_parties_touch before update on public.compliance_parties for each row execute function public.fn_compliance_touch();
drop trigger if exists trg_compliance_docs_touch on public.compliance_docs;
create trigger trg_compliance_docs_touch before update on public.compliance_docs for each row execute function public.fn_compliance_touch();

-- RLS: the office team (admin, manager, lead_pm, project_manager, apm) reads and writes
do $$
declare t text;
begin
  foreach t in array array['compliance_parties','compliance_docs','compliance_reminders','compliance_settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_office', t);
    execute format($p$create policy %I on public.%I for all to authenticated
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager','lead_pm','project_manager','apm')))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager','lead_pm','project_manager','apm')))$p$, t || '_office', t);
  end loop;
end $$;

-- seed: every subcontractor and vendor already in the app (re-runnable)
insert into public.compliance_parties (kind, name, subcontractor_id, trade, contact_name, email, phone, is_active)
select 'subcontractor', s.name, s.id, s.trade, s.contact_name, nullif(s.contact_email, ''), nullif(s.contact_phone, ''), coalesce(s.is_active, true)
from public.subcontractors s
where not exists (select 1 from public.compliance_parties c where c.subcontractor_id = s.id or lower(c.name) = lower(s.name));

insert into public.compliance_parties (kind, name, vendor_id, email, is_active, msa_required)
select 'vendor', v.name, v.id, nullif(v.quote_email, ''), coalesce(v.is_active, true), false
from public.vendors v
where not exists (select 1 from public.compliance_parties c where c.vendor_id = v.id or lower(c.name) = lower(v.name));

select (select count(*) from public.compliance_parties) as parties,
       (select count(*) from public.compliance_parties where kind = 'subcontractor') as subs,
       (select count(*) from public.compliance_parties where kind = 'vendor') as vendors;

-- Drive folder of the company: NW Projects / Subcontractors & Vendors / <company> (proxy v3.14 sub_folder)
alter table public.compliance_parties add column if not exists drive_folder_id text;
alter table public.compliance_parties add column if not exists drive_folder_url text;

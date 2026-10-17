-- Labor cost per project from the Mason payroll journal (2026-10-17).
-- Mason sends a QuickBooks journal-entry CSV after every payroll (Journal No., Journal Date, Account Name, Debits, Credits,
-- Description, Name, Location, Class): one line per payroll x project x account — Labor Cost (W-2), Payroll Taxes (Labor W-2),
-- Labor Cost (1099NEC), Reimbursable Expenses — with the project in the Name column. No employee-level data.
-- labor-import.html loads that file, maps Mason's project names to app projects (mason_project_map) and refreshes
-- project_costs.labor_spent (WIP) from the sum.

create table if not exists public.labor_costs (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id) on delete set null,
  mason_name  text not null,                 -- the project name as Mason prints it
  pay_date    date not null,
  journal_no  text not null,                 -- NW-PR-20260106 / NW-ADJ-20260630
  kind        text not null check (kind in ('w2','taxes','1099','reimb','other')),
  amount      numeric(12,2) not null default 0,
  source_file text,
  created_at  timestamptz not null default now(),
  unique (journal_no, mason_name, kind)
);
create index if not exists idx_labor_costs_project on public.labor_costs(project_id, pay_date);

create table if not exists public.mason_project_map (
  mason_name  text primary key,
  project_id  uuid references public.projects(id) on delete set null,
  ignore      boolean not null default false,   -- "SERVICE CALL" and other buckets that are not a project
  updated_at  timestamptz not null default now()
);

alter table public.labor_costs enable row level security;
alter table public.mason_project_map enable row level security;
drop policy if exists labor_costs_office on public.labor_costs;
create policy labor_costs_office on public.labor_costs for all to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['admin','manager','lead_pm'])))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['admin','manager','lead_pm'])));
drop policy if exists mason_map_office on public.mason_project_map;
create policy mason_map_office on public.mason_project_map for all to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['admin','manager','lead_pm'])))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['admin','manager','lead_pm'])));

select 'mason labor ready' as result;

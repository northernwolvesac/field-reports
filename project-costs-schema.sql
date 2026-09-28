-- Project costs (2026-09-28): the cost side of the WIP schedule, one row per project.
-- Estimated labor / materials / subs come from the estimate; spent amounts are entered by Karen (labor by hand,
-- materials + subs from vendor invoices) in Projects → Costs. wip.html turns them into cost to complete,
-- % complete by cost, earned revenue, over / under billings and gross profit. Seeded from NWAC_Master_Records
-- "Projects Costs & Profits" (FY 2025-26, as of 2026-03-31).

create table if not exists public.project_costs (
  project_id      uuid primary key references public.projects(id) on delete cascade,
  labor_est       numeric(12,2) not null default 0,
  materials_est   numeric(12,2) not null default 0,
  subs_est        numeric(12,2) not null default 0,
  labor_spent     numeric(12,2) not null default 0,
  materials_spent numeric(12,2) not null default 0,
  subs_spent      numeric(12,2) not null default 0,
  hours_left      numeric(10,2),
  as_of           date,
  notes           text,
  source          text,                       -- 'master-xlsx' for the seeded rows, 'app' afterwards
  updated_by      uuid references public.profiles(id) on delete set null,
  updated_at      timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

alter table public.project_costs enable row level security;

-- office roles only (no technicians, no limited PMs): costs are financial data
drop policy if exists project_costs_read on public.project_costs;
create policy project_costs_read on public.project_costs for select to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['admin','manager','lead_pm','project_manager','apm'])));
drop policy if exists project_costs_write on public.project_costs;
create policy project_costs_write on public.project_costs for all to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['admin','manager','lead_pm','project_manager','apm'])))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['admin','manager','lead_pm','project_manager','apm'])));

select 'project_costs ready' as result;

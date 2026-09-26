-- NWAC Procore estimating history (read-only copy, for unit norms / parametric models). Office roles only.
create table if not exists public.est_procore_projects (
  id bigint primary key, name text, created date, status text, total numeric, square_feet numeric,
  estimator_id bigint, project_number text, proposal_id bigint
);
create table if not exists public.est_procore_lines (
  id bigserial primary key, project_id bigint not null, grp text, item text, type text, qty numeric, unit text,
  unit_cost numeric, labor_min numeric, waste numeric, cost_code text, manufacturer text
);
create index if not exists est_procore_lines_project on public.est_procore_lines(project_id);
create index if not exists est_procore_lines_item on public.est_procore_lines(lower(item));

do $$
declare t text;
begin
  foreach t in array array['est_procore_projects','est_procore_lines'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_office', t);
    execute format($p$create policy %I on public.%I for all to authenticated
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager','lead_pm','project_manager','apm')))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager','lead_pm','project_manager','apm')))$p$, t || '_office', t);
  end loop;
end $$;
select 'ok' as procore_history;

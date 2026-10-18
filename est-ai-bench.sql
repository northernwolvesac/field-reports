-- 2026-10-18: AI benchmark page (ai-benchmark.html). One row per benchmark job = an AI Estimator session whose drawings were also
-- taken off in Procore (the truth). Every engine version recomputes the measured quantities from the stored sheet reads and keeps
-- one run per version, so the accuracy table and its history are always current.
-- Run in Supabase → SQL Editor.

create table if not exists public.est_ai_bench (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid not null unique references public.ai_est_sessions(id) on delete cascade,
  name                text not null,
  procore_project_id  bigint,                       -- est_procore_projects.id the truth comes from (optional)
  truth               jsonb not null default '{}',  -- {duct_ft, outlets_ea, linear_ft, pipe_ft, equipment_ea, dampers_ea}
  truth_src           text,                         -- 'Procore takeoff', 'Kastriot breakdown' …
  use                 boolean not null default true,-- scored in the means (false = shown, not scored)
  skip_sheets         text[],                       -- sheet numbers left out (another tenant's plan in the set …)
  notes               text,
  sort_order          int,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create table if not exists public.est_ai_bench_runs (
  id          uuid primary key default gen_random_uuid(),
  bench_id    uuid not null references public.est_ai_bench(id) on delete cascade,
  version     text not null,                        -- app / engine version (service worker cache name, e.g. v439)
  at          timestamptz not null default now(),
  measured    jsonb not null default '{}',          -- {duct_ft, ai_duct_ft, outlets_ea, linear_ft, pipe_ft, equipment_ea, sheets, cost}
  user_name   text,
  unique (bench_id, version)
);
create index if not exists est_ai_bench_runs_bench on public.est_ai_bench_runs(bench_id);

drop trigger if exists trg_est_ai_bench_touch on public.est_ai_bench;
create trigger trg_est_ai_bench_touch before update on public.est_ai_bench for each row execute function fn_estimating_touch();

do $$
declare t text;
begin
  foreach t in array array['est_ai_bench','est_ai_bench_runs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_office', t);
    execute format($p$create policy %I on public.%I for all to authenticated
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager','lead_pm','project_manager','apm','estimator')))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager','lead_pm','project_manager','apm','estimator')))$p$, t || '_office', t);
  end loop;
end $$;

select 'ok' as est_ai_bench_schema;

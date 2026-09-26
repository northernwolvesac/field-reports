-- 2026-09-26: Estimating knowledge base (from Kastriot's Drive folder "Estimating", id 13OQ7604JDIAyBuYxRROe-a6u5XBSWS45)
-- Office roles only: pricing standards, vendor routing and past bids are internal.

-- Standards, process rules, proposal rules, change history, per-project analyses (markdown) — the AI estimator reads these.
create table if not exists public.est_knowledge (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,          -- e.g. 'standard/pricing-and-markup', 'project/crozier/quote-coverage'
  category    text not null,                 -- standard | process | proposal | vendors | subcontractors | history | project | workflow
  title       text not null,
  body_md     text not null,
  source_path text,                          -- path inside the Estimating folder
  project     text,                          -- for category 'project'
  updated_at  timestamptz not null default now()
);

-- Past bids with full cost breakdowns = ground truth for checking automatic takeoff / pricing.
create table if not exists public.est_benchmark (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  estimator    text,
  created      date,
  location     text,
  description  text,
  status       text,                         -- complete | progress | pending
  status_label text,
  total        numeric(14,2),
  breakdown    jsonb,                        -- [{title, items:[[label, amount]], subtotal}]
  totals       jsonb,
  notes        jsonb,
  drive_folder text,                         -- path under Estimating/Projects/
  files        jsonb,                        -- [{path, size}] drawings, quotes, specs, leveling sheets…
  updated_at   timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['est_knowledge','est_benchmark'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_office', t);
    execute format($p$create policy %I on public.%I for all to authenticated
      using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['admin','manager','lead_pm','project_manager','apm'])))
      with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['admin','manager','lead_pm','project_manager','apm'])))$p$, t || '_office', t);
  end loop;
end $$;

-- Quote numbers continue Kastriot's Drive log: 10000..10012 are taken (BOSS = 10011, 360 Lexington = 10012) -> next 10013.
select setval('public.estimates_quote_no_seq',
  greatest(10012, (select last_value from public.estimates_quote_no_seq), coalesce((select max(quote_number) from public.estimates), 0)));

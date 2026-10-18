-- 2026-10-17: AI review queue (Takeoff page → "AI review" tab). Every item the AI produced on a bid — equipment and air-device
-- rows read on the sheets, duct / pipe / riser runs measured from the drawing lines — is accepted, corrected or deleted by the
-- estimator. The decisions are kept here: corrections feed the estimate (est-engine.js applies them when the AI Estimator prices;
-- run edits go through the takeoff → estimate sync) and the log is the training data for the reader.
-- Run in Supabase → SQL Editor ("Run without RLS" is fine — the script enables RLS itself).

create table if not exists public.est_ai_corrections (
  id            uuid primary key default gen_random_uuid(),
  estimate_id   uuid not null references public.estimates(id) on delete cascade,
  session_id    uuid references public.ai_est_sessions(id) on delete set null,
  page_id       uuid references public.ai_est_pages(id) on delete set null,       -- AI session page the item came from
  drawing_id    uuid references public.estimate_drawings(id) on delete set null,  -- takeoff plan it was checked on
  page_number   int,
  sheet_no      text,
  kind          text not null check (kind in ('duct','pipe','riser','device','equipment')),
  item_key      text not null,                 -- measurement id for runs; '<page_id>:<tag>|<type>' for device / equipment rows
  status        text not null check (status in ('accepted','corrected','deleted')),
  original      jsonb,                         -- what the AI had (row / mark snapshot)
  corrected     jsonb,                         -- the estimator's values (status = corrected)
  note          text,
  user_id       uuid default auth.uid(),
  user_name     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (estimate_id, kind, item_key)
);
create index if not exists est_ai_corrections_est on public.est_ai_corrections(estimate_id);
create index if not exists est_ai_corrections_session on public.est_ai_corrections(session_id);

drop trigger if exists trg_est_ai_corrections_touch on public.est_ai_corrections;
create trigger trg_est_ai_corrections_touch before update on public.est_ai_corrections
  for each row execute function fn_estimating_touch();

alter table public.est_ai_corrections enable row level security;
drop policy if exists est_ai_corrections_office on public.est_ai_corrections;
create policy est_ai_corrections_office on public.est_ai_corrections for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager','lead_pm','project_manager','apm','estimator')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager','lead_pm','project_manager','apm','estimator')));

select 'ok' as est_ai_corrections_schema;

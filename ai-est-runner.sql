-- 2026-10-18: AI Estimator long-job runner. A sheet read is claimed by exactly one browser tab (the row flips pending/error →
-- running only once), failed reads retry with backoff, a sheet left "running" with no answer times out and is offered again.
-- Run in Supabase → SQL Editor.
alter table public.ai_est_pages add column if not exists attempts int not null default 0;
alter table public.ai_est_pages add column if not exists finished_at timestamptz;
create index if not exists ai_est_pages_session_status on public.ai_est_pages(session_id, status);
select 'ok' as ai_est_runner_schema;

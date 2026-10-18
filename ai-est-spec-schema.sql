-- 2026-10-18: Spec Q&A with citations (AI Estimator → "Ask the specs"). The bid's specification / general-notes sheets are
-- chunked per CSI section and clause in the browser (no AI cost) into ai_est_spec_chunks; the Edge Function action "specqa"
-- runs ai_est_spec_search() and answers with Claude, citing section §clause + sheet + page; every question is logged.
-- Run in Supabase → SQL Editor ("Run without RLS" is fine — the script enables RLS itself).

create table if not exists public.ai_est_spec_chunks (
  id          bigserial primary key,
  session_id  uuid not null references public.ai_est_sessions(id) on delete cascade,
  page_id     uuid references public.ai_est_pages(id) on delete cascade,
  sheet_no    text,
  page_no     int,
  section     text,                        -- "23 31 13 — Metal Ducts" (CSI section) or the sheet's heading
  clause      text,                        -- "2.3 B" / "PART 2 - PRODUCTS" / an all-caps heading
  chunk_no    int not null default 0,
  content     text not null,
  tsv         tsvector generated always as (to_tsvector('english', coalesce(section, '') || ' ' || coalesce(clause, '') || ' ' || content)) stored
);
create index if not exists ai_est_spec_chunks_tsv on public.ai_est_spec_chunks using gin (tsv);
create index if not exists ai_est_spec_chunks_session on public.ai_est_spec_chunks(session_id, sheet_no, page_no, chunk_no);

create table if not exists public.ai_est_spec_qa (
  id          bigserial primary key,
  session_id  uuid not null references public.ai_est_sessions(id) on delete cascade,
  question    text not null,
  answer      text,
  sources     jsonb,                       -- [{n, sheet, page, section, clause, page_id, snippet}] — the passages the answer cites
  used        jsonb,                       -- passage numbers the model cited
  found       boolean,                     -- false = the specs do not answer it
  model       text,
  cost        numeric(10,4),
  user_id     uuid default auth.uid(),
  user_name   text,
  created_at  timestamptz not null default now()
);
create index if not exists ai_est_spec_qa_session on public.ai_est_spec_qa(session_id, created_at desc);

do $$
declare t text;
begin
  foreach t in array array['ai_est_spec_chunks','ai_est_spec_qa'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_office', t);
    execute format($p$create policy %I on public.%I for all to authenticated
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager','lead_pm','project_manager','apm','estimator')))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager','lead_pm','project_manager','apm','estimator')))$p$, t || '_office', t);
  end loop;
end $$;

-- ranked full-text search inside one session's specs (websearch syntax: quotes, OR, -word)
create or replace function public.ai_est_spec_search(sid uuid, q text, lim int default 12)
returns table (chunk_id bigint, page_id uuid, sheet_no text, page_no int, section text, clause text, content text, rank real)
language sql stable security invoker as $$
  select c.id, c.page_id, c.sheet_no, c.page_no, c.section, c.clause, c.content,
         ts_rank_cd(c.tsv, websearch_to_tsquery('english', q)) as rank
  from public.ai_est_spec_chunks c
  where c.session_id = sid and c.tsv @@ websearch_to_tsquery('english', q)
  order by rank desc, c.sheet_no, c.page_no, c.chunk_no
  limit lim;
$$;

select 'ok' as ai_est_spec_schema;

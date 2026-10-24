-- ═══════════════════════════════════════════════════════════════════
--  App support tickets (2026-10-24)
--  Every "⚑ Problem / Suggestion" from the app and every e-mail to app.ai.support@northernwolvesac.com becomes a row here.
--  The Edge Function `support` writes the rows (service role) and hands each ticket to the cloud Claude routine through the
--  PRIVATE repo northernwolvesac/app-support (inbox/T<no>.md). Results come back through the same function (action update).
--  Users see their own tickets; admins see and decide all of them.
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.support_tickets (
  id              uuid primary key default gen_random_uuid(),
  ticket_no       bigint generated always as identity unique,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  source          text not null default 'app' check (source in ('app', 'email')),
  reporter_id     uuid references auth.users(id) on delete set null,
  reporter_email  text,
  reporter_name   text,
  kind            text not null default 'bug' check (kind in ('bug', 'idea', 'question')),
  title           text,
  body            text not null,
  page_url        text,
  user_agent      text,
  app_version     text,
  console_errors  jsonb,
  screenshot_path text,
  status          text not null default 'new'
                  check (status in ('new', 'in_progress', 'fixed', 'answered', 'needs_russ', 'approved', 'declined', 'closed', 'error')),
  resolution      text,
  fixed_version   text,
  decided_by      uuid references auth.users(id) on delete set null,
  decided_at      timestamptz,
  decision_note   text,
  handed_off_at   timestamptz,
  email_message_id text unique,
  history         jsonb not null default '[]'::jsonb
);
create index if not exists support_tickets_status_idx on public.support_tickets (status, created_at desc);
create index if not exists support_tickets_reporter_idx on public.support_tickets (reporter_id, created_at desc);

create or replace function public.fn_support_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists trg_support_touch on public.support_tickets;
create trigger trg_support_touch before update on public.support_tickets for each row execute function public.fn_support_touch();

alter table public.support_tickets enable row level security;
-- everyone signed in reads their own tickets; admins read all (writes go through the Edge Function with the service role)
drop policy if exists support_tickets_read on public.support_tickets;
create policy support_tickets_read on public.support_tickets for select to authenticated
  using (reporter_id = auth.uid()
         or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- screenshots: private bucket, a user uploads into his own folder <uid>/..., admins read all
insert into storage.buckets (id, name, public) values ('support-screenshots', 'support-screenshots', false)
  on conflict (id) do nothing;
drop policy if exists support_shots_insert on storage.objects;
create policy support_shots_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'support-screenshots' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists support_shots_read on storage.objects;
create policy support_shots_read on storage.objects for select to authenticated
  using (bucket_id = 'support-screenshots' and ((storage.foldername(name))[1] = auth.uid()::text
         or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')));

-- live updates on the Support page
do $$ begin
  begin alter publication supabase_realtime add table public.support_tickets; exception when duplicate_object then null; when undefined_object then null; end;
end $$;

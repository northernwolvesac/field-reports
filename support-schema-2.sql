-- App support, human-in-the-loop (2026-10-24): the AI engineer prepares a pull request (status 'ready'),
-- Ruslan or Alikhan approve it in the app and only then it is merged and deployed.
alter table public.support_tickets add column if not exists branch text;
alter table public.support_tickets add column if not exists pr_number int;
alter table public.support_tickets add column if not exists pr_url text;
alter table public.support_tickets drop constraint if exists support_tickets_status_check;
alter table public.support_tickets add constraint support_tickets_status_check
  check (status in ('new', 'in_progress', 'ready', 'fixed', 'answered', 'needs_russ', 'approved', 'declined', 'closed', 'error'));
-- the two approvers (Ruslan, Alikhan) read every ticket, whatever their role
drop policy if exists support_tickets_read on public.support_tickets;
create policy support_tickets_read on public.support_tickets for select to authenticated
  using (reporter_id = auth.uid()
         or lower(coalesce(auth.jwt() ->> 'email', '')) in ('ruslan@northernwolvesac.com', 'alikhan@northernwolvesac.com')
         or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
drop policy if exists support_shots_read on storage.objects;
create policy support_shots_read on storage.objects for select to authenticated
  using (bucket_id = 'support-screenshots' and ((storage.foldername(name))[1] = auth.uid()::text
         or lower(coalesce(auth.jwt() ->> 'email', '')) in ('ruslan@northernwolvesac.com', 'alikhan@northernwolvesac.com')
         or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')));

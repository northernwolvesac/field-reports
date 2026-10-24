-- App support (2026-10-24): signed-in users may file their own ticket directly (fallback while the support service is not deployed)
drop policy if exists support_tickets_insert on public.support_tickets;
create policy support_tickets_insert on public.support_tickets for insert to authenticated
  with check (reporter_id = auth.uid() and source = 'app' and status = 'new');

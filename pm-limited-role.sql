-- Limited project manager role (2026-09-28): new PMs get projects + documents for their first month,
-- no prime contracts, change orders, purchase-order log, bid board or financial folders.
-- profiles.role 'pm_limited' — the app (index/projects/project-files/nw-drive-browser) and the Drive proxy v3.11 know it;
-- aia_* / purchase_orders / estimating policies keep their office-only role lists, so the data stays locked at the database too.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('tech','foreman','pm','apm','lead_pm','project_manager','manager','admin','pm_limited'));

-- a limited PM may prepare submittals / IOM packages (the submittal page allows the role; the table policy must too)
drop policy if exists submittals_write on public.submittals;
create policy submittals_write on public.submittals for all to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['admin','manager','lead_pm','project_manager','apm','pm_limited'])))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['admin','manager','lead_pm','project_manager','apm','pm_limited'])));

-- after Sharon Bracey signs up at app.northernwolvesac.com with sharon@northernwolvesac.com:
update public.profiles set role = 'pm_limited', full_name = coalesce(nullif(full_name, ''), 'Sharon Bracey') where lower(email) = 'sharon@northernwolvesac.com';

select 'pm_limited ready' as result;

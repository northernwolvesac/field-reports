-- Limited PM → assigned projects only (2026-09-28).
-- profiles.project_ids lists the app project ids a pm_limited user may see; the app filters its lists by it, the Drive proxy
-- (v3.12) confines list/upload/read to those projects, and these policies enforce it at the database for every other role-agnostic
-- table that is read by project. Full roles are unaffected (project_visible() is true for them).

alter table public.profiles add column if not exists project_ids uuid[];

create or replace function public.project_visible(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select case when p.role = 'pm_limited' then pid = any(coalesce(p.project_ids, '{}'::uuid[])) else true end
                     from public.profiles p where p.id = auth.uid()), true);
$$;

drop policy if exists "projects_select" on public.projects;
create policy "projects_select" on public.projects for select to authenticated using (public.project_visible(id));

drop policy if exists "project_files_read" on public.project_files;
create policy "project_files_read" on public.project_files for select to authenticated using (public.project_visible(project_id));

drop policy if exists submittals_read on public.submittals;
create policy submittals_read on public.submittals for select to authenticated using (public.project_visible(project_id));

drop policy if exists "rfis_select" on public.rfis;
create policy "rfis_select" on public.rfis for select to authenticated using (public.project_visible(project_id));

-- Sharon Bracey: Sadhu Vaswani Center, Pura Vida - Monmouth, FS8 / Kidstrong (run again after he signs up if the row does not exist yet)
update public.profiles
   set role = 'pm_limited',
       full_name = coalesce(nullif(full_name, ''), 'Sharon Bracey'),
       project_ids = array['2ea490e4-22de-4a09-8934-77f1b3e2a5c4','587ac970-e73d-4f89-9dad-9863ea435345','b4cf60da-0c3a-4549-acf5-72566c2917d9']::uuid[]
 where lower(email) = 'sharon@northernwolvesac.com';

select 'limited projects ready' as result, (select count(*) from public.profiles where lower(email) = 'sharon@northernwolvesac.com') as sharon_rows;

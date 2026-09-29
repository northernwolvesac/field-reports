-- ═══════════════════════════════════════════════════════════════════════════
-- New access code: 'estimator'  (2026-09-29)
-- Bid Board + every estimating tool (Bid Project, Estimating, Takeoff, Cost Catalog, AI Estimator, Knowledge) — nothing else.
-- Run once in Supabase → SQL Editor (safe to re-run).
--
--  1  profiles.role accepts 'estimator'
--  2  estimating tables: write policies include 'estimator'
--  3  estimating tools tables (AI Estimator, norms, knowledge, Procore history): policies include 'estimator'
--  4  project data is hidden from estimators: projects, project files, submittals, RFIs (prime contracts, POs, WIP costs are
--     already office-only); bid documents (project_files with estimate_id) stay visible
--  5  role presets: an account created later with a preset email gets its role automatically at signup (Bani)
--  6  hardening: only an admin / manager can change role, project access or active status of a profile
--  7  Kastriot → estimator, Bani → estimator (immediately if he already has an account)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. role code ────────────────────────────────────────────────────────────
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('tech','foreman','pm','apm','lead_pm','project_manager','manager','admin','pm_limited','estimator'));

-- ─── 2. estimating tables: write access ──────────────────────────────────────
do $$
declare
  tbls text[] := array['estimates','estimate_line_items','estimate_assemblies','estimate_drawings','estimate_measurements',
                       'estimate_takeoff_layers','bid_project_notes','bid_project_tasks','est_catalog_folders','est_catalog_items'];
  pols text[] := array['estimates_write','estimate_line_items_write','estimate_assemblies_write','estimate_drawings_write','estimate_measurements_write',
                       'estimate_takeoff_layers_write','bid_notes_write','bid_tasks_write','est_catalog_folders_write','est_catalog_items_write'];
  i int;
begin
  for i in 1 .. array_length(tbls, 1) loop
    if to_regclass('public.' || tbls[i]) is null then
      raise notice 'skip % (table not found)', tbls[i];
      continue;
    end if;
    execute format('drop policy if exists %I on public.%I', pols[i], tbls[i]);
    execute format($p$create policy %I on public.%I for all to authenticated
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager','lead_pm','project_manager','apm','estimator')))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager','lead_pm','project_manager','apm','estimator')))$p$, pols[i], tbls[i]);
  end loop;
end $$;

-- ─── 3. estimating tools: AI Estimator, unit norms, knowledge base, Procore history ─────────────
do $$
declare t text;
begin
  foreach t in array array['ai_est_sessions','ai_est_files','ai_est_pages','est_norms','est_knowledge','est_benchmark','est_procore_projects','est_procore_lines'] loop
    if to_regclass('public.' || t) is null then
      raise notice 'skip % (table not found)', t;
      continue;
    end if;
    execute format('drop policy if exists %I on public.%I', t || '_office', t);
    execute format($p$create policy %I on public.%I for all to authenticated
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager','lead_pm','project_manager','apm','estimator')))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager','lead_pm','project_manager','apm','estimator')))$p$, t || '_office', t);
  end loop;
end $$;

-- private bucket for AI Estimator bid documents
drop policy if exists ai_estimator_office on storage.objects;
create policy ai_estimator_office on storage.objects for all to authenticated
  using (bucket_id = 'ai-estimator' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager','lead_pm','project_manager','apm','estimator')))
  with check (bucket_id = 'ai-estimator' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager','lead_pm','project_manager','apm','estimator')));

-- ─── 4. project data stays hidden from estimators ───────────────────────────────────────────────
create or replace function public.project_visible(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select case when p.role = 'pm_limited' then pid = any(coalesce(p.project_ids, '{}'::uuid[]))
                               when p.role = 'estimator'  then false
                               else true end
                     from public.profiles p where p.id = auth.uid()), true);
$$;

create or replace function public.is_estimator()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select p.role = 'estimator' from public.profiles p where p.id = auth.uid()), false);
$$;

-- project documents: as before (project_visible), plus the bid documents attached to estimates (estimate_id) for estimators
drop policy if exists "project_files_read" on public.project_files;
create policy "project_files_read" on public.project_files for select to authenticated
  using (public.project_visible(project_id) or (estimate_id is not null and public.is_estimator()));

-- ─── 5. role presets: the role is applied when the account is created ────────────────────────────
create table if not exists public.role_presets (
  email text primary key,
  role  text not null,
  note  text
);
alter table public.role_presets enable row level security;   -- no policies: only the trigger below (security definer) and the SQL editor can touch it

insert into public.role_presets (email, role, note)
values ('bani@northernwolvesac.com', 'estimator', 'Bani — estimator: Bid Board + estimating tools only (2026-09-29)')
on conflict (email) do update set role = excluded.role, note = excluded.note;

create or replace function public.apply_role_preset()
returns trigger language plpgsql security definer set search_path = public as $$
declare r text;
begin
  select rp.role into r from public.role_presets rp where lower(rp.email) = lower(new.email);
  if r is not null then new.role := r; end if;
  return new;
end $$;

drop trigger if exists profiles_apply_role_preset on public.profiles;
create trigger profiles_apply_role_preset before insert on public.profiles
  for each row execute function public.apply_role_preset();

-- ─── 6. hardening: nobody can promote themselves ───────────────────────────────────────────────
-- (the old "profiles_update_own" policy let every signed-in user update their own row, including the role column)
create or replace function public.guard_profile_privileged()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and (new.role is distinct from old.role
          or new.project_ids is distinct from old.project_ids
          or new.is_active is distinct from old.is_active) then
    if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager')) then
      raise exception 'Only an admin or manager can change a profile''s role, project access or active status';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard_privileged on public.profiles;
create trigger profiles_guard_privileged before update on public.profiles
  for each row execute function public.guard_profile_privileged();

-- ─── 7. people ──────────────────────────────────────────────────────────────────────────────
update public.profiles set role = 'estimator' where lower(email) in ('kastriot@northernwolvesac.com', 'bani@northernwolvesac.com');

select p.email, p.full_name, p.role, (select count(*) from public.role_presets) as presets
  from public.profiles p
 where lower(p.email) in ('kastriot@northernwolvesac.com', 'bani@northernwolvesac.com')
union all
select 'bani@northernwolvesac.com — no account yet: the role is applied automatically when he signs up', '', 'estimator (preset)', 1
 where not exists (select 1 from public.profiles where lower(email) = 'bani@northernwolvesac.com');

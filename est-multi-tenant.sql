-- est-multi-tenant.sql — roadmap item 8: organisations for the estimating product (2026-10-19)
-- Orgs + members, org_id on every product table (default NWAC), RLS by membership instead of office role,
-- storage policed by the owning session / document, invites by e-mail, a library copy for new orgs.
-- Re-runnable. NWAC = 11111111-1111-4111-8111-111111111111; every current office / estimator profile becomes a member.

create table if not exists public.est_orgs (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  settings    jsonb not null default '{}'::jsonb,       -- labor_rate, overhead_pct, duct family defaults … (per-org engine settings later)
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);
insert into public.est_orgs (id, slug, name) values ('11111111-1111-4111-8111-111111111111', 'nwac', 'Northern Wolves AC')
  on conflict (id) do nothing;

create table if not exists public.est_org_members (
  org_id      uuid not null references public.est_orgs(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        text not null default 'estimator' check (role in ('owner','admin','estimator','viewer')),
  created_at  timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index if not exists est_org_members_user on public.est_org_members(user_id);

create table if not exists public.est_org_invites (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.est_orgs(id) on delete cascade,
  email       text not null,
  role        text not null default 'estimator' check (role in ('owner','admin','estimator','viewer')),
  invited_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  claimed_at  timestamptz,
  unique (org_id, email)
);

-- ── helpers (security definer: the policies may call them without recursing into their own tables) ──
create or replace function public.est_is_member(o uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select o is not null and exists (select 1 from public.est_org_members m where m.org_id = o and m.user_id = auth.uid());
$$;
create or replace function public.est_org_role(o uuid) returns text
language sql stable security definer set search_path = public as $$
  select m.role from public.est_org_members m where m.org_id = o and m.user_id = auth.uid();
$$;
create or replace function public.est_is_global_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;
-- the caller's pending invites become memberships (called by est-org.js on every load)
create or replace function public.est_claim_invites() returns int
language plpgsql security definer set search_path = public as $$
declare n int := 0; r record; em text;
begin
  select email into em from public.profiles where id = auth.uid();
  if em is null then return 0; end if;
  for r in select * from public.est_org_invites where lower(email) = lower(em) and claimed_at is null loop
    insert into public.est_org_members (org_id, user_id, role) values (r.org_id, auth.uid(), r.role) on conflict (org_id, user_id) do nothing;
    update public.est_org_invites set claimed_at = now() where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- NWAC: every office / estimator profile is a member (admins + managers as org admins); new such profiles join automatically
insert into public.est_org_members (org_id, user_id, role)
select '11111111-1111-4111-8111-111111111111', p.id, case when p.role in ('admin') then 'owner' when p.role in ('manager') then 'admin' else 'estimator' end
from public.profiles p where p.role in ('admin','manager','lead_pm','project_manager','apm','pm','estimator','pm_limited')
on conflict (org_id, user_id) do nothing;

create or replace function public.est_profile_membership() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role in ('admin','manager','lead_pm','project_manager','apm','pm','estimator','pm_limited')
     and not exists (select 1 from public.est_org_members m where m.user_id = new.id)
     and not exists (select 1 from public.est_org_invites i where lower(i.email) = lower(coalesce(new.email, '')) and i.claimed_at is null) then
    insert into public.est_org_members (org_id, user_id, role)
      values ('11111111-1111-4111-8111-111111111111', new.id, case when new.role = 'admin' then 'owner' when new.role = 'manager' then 'admin' else 'estimator' end)
      on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists est_profile_membership on public.profiles;
create trigger est_profile_membership after insert or update of role on public.profiles for each row execute function public.est_profile_membership();

-- ── org_id on the product tables ──
do $$
declare t text;
begin
  foreach t in array array['ai_est_sessions','ai_est_files','ai_est_pages','est_ai_corrections','est_ai_bench','est_ai_bench_runs',
                           'ai_est_spec_chunks','ai_est_spec_qa','est_rules','est_kb_docs','est_kb_chunks','est_kb_chat_log',
                           'est_catalog_folders','est_catalog_items','est_catalog_price_log','est_norms'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('alter table public.%I add column if not exists org_id uuid references public.est_orgs(id)', t);
    execute format('update public.%I set org_id = %L where org_id is null', t, '11111111-1111-4111-8111-111111111111');
    execute format('alter table public.%I alter column org_id set default %L', t, '11111111-1111-4111-8111-111111111111');
    execute format('alter table public.%I alter column org_id set not null', t);
    execute format('create index if not exists %I on public.%I(org_id)', t || '_org', t);
  end loop;
end $$;

-- child rows take the parent's org (the pages hand their session id, the bench its session, the run its bench, the chunk its doc)
create or replace function public.est_org_inherit() returns trigger
language plpgsql security definer set search_path = public as $$
declare o uuid;
begin
  if tg_table_name in ('ai_est_files','ai_est_pages','est_ai_corrections','ai_est_spec_chunks','ai_est_spec_qa','est_ai_bench') then
    select org_id into o from public.ai_est_sessions where id = new.session_id;
  elsif tg_table_name = 'est_ai_bench_runs' then
    select org_id into o from public.est_ai_bench where id = new.bench_id;
  elsif tg_table_name = 'est_kb_chunks' then
    select org_id into o from public.est_kb_docs where id = new.doc_id;
  elsif tg_table_name = 'est_catalog_price_log' then
    select org_id into o from public.est_catalog_items where id = new.item_id;
  end if;
  if o is not null then new.org_id := o; end if;
  return new;
end $$;
do $$
declare t text;
begin
  foreach t in array array['ai_est_files','ai_est_pages','est_ai_corrections','ai_est_spec_chunks','ai_est_spec_qa','est_ai_bench','est_ai_bench_runs','est_kb_chunks','est_catalog_price_log'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('drop trigger if exists est_org_inherit on public.%I', t);
    execute format('create trigger est_org_inherit before insert on public.%I for each row execute function public.est_org_inherit()', t);
  end loop;
end $$;

-- per-org uniqueness where the old key was global
alter table public.est_norms drop constraint if exists est_norms_kind_item_unit_key;
create unique index if not exists est_norms_org_kind_item_unit on public.est_norms(org_id, kind, item, unit);

-- ── RLS: membership replaces office roles on every product table ──
do $$
declare t text; pol record;
begin
  foreach t in array array['ai_est_sessions','ai_est_files','ai_est_pages','est_ai_corrections','est_ai_bench','est_ai_bench_runs',
                           'ai_est_spec_chunks','ai_est_spec_qa','est_rules','est_kb_docs','est_kb_chunks','est_kb_chat_log',
                           'est_catalog_folders','est_catalog_items','est_catalog_price_log','est_norms'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('alter table public.%I enable row level security', t);
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, t);
    end loop;
    execute format($p$create policy %I on public.%I for all to authenticated
      using (public.est_is_member(org_id) or public.est_is_global_admin())
      with check (public.est_is_member(org_id) or public.est_is_global_admin())$p$, t || '_member', t);
  end loop;
end $$;

-- orgs / members / invites: members read their orgs; org owners / admins and the global admin manage them
alter table public.est_orgs enable row level security;
alter table public.est_org_members enable row level security;
alter table public.est_org_invites enable row level security;
drop policy if exists est_orgs_read on public.est_orgs;
create policy est_orgs_read on public.est_orgs for select to authenticated using (public.est_is_member(id) or public.est_is_global_admin());
drop policy if exists est_orgs_write on public.est_orgs;
create policy est_orgs_write on public.est_orgs for all to authenticated using (public.est_is_global_admin() or public.est_org_role(id) in ('owner','admin')) with check (public.est_is_global_admin() or public.est_org_role(id) in ('owner','admin') or created_by = auth.uid());
drop policy if exists est_org_members_read on public.est_org_members;
create policy est_org_members_read on public.est_org_members for select to authenticated using (user_id = auth.uid() or public.est_is_member(org_id) or public.est_is_global_admin());
drop policy if exists est_org_members_write on public.est_org_members;
create policy est_org_members_write on public.est_org_members for all to authenticated using (public.est_is_global_admin() or public.est_org_role(org_id) in ('owner','admin')) with check (public.est_is_global_admin() or public.est_org_role(org_id) in ('owner','admin'));
drop policy if exists est_org_invites_rw on public.est_org_invites;
create policy est_org_invites_rw on public.est_org_invites for all to authenticated using (public.est_is_global_admin() or public.est_org_role(org_id) in ('owner','admin')) with check (public.est_is_global_admin() or public.est_org_role(org_id) in ('owner','admin'));
-- a new org: the creator becomes its owner
create or replace function public.est_org_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.est_org_members (org_id, user_id, role) values (new.id, coalesce(new.created_by, auth.uid()), 'owner') on conflict do nothing;
  return new;
end $$;
drop trigger if exists est_org_owner on public.est_orgs;
create trigger est_org_owner after insert on public.est_orgs for each row execute function public.est_org_owner();

-- ── storage: the owning session / document decides ──
drop policy if exists ai_estimator_office on storage.objects;
drop policy if exists ai_estimator_member on storage.objects;
create policy ai_estimator_member on storage.objects for all to authenticated
  using (bucket_id = 'ai-estimator' and (public.est_is_global_admin() or exists (select 1 from public.ai_est_sessions s where s.id::text = (storage.foldername(name))[1] and public.est_is_member(s.org_id))))
  with check (bucket_id = 'ai-estimator' and (public.est_is_global_admin() or exists (select 1 from public.ai_est_sessions s where s.id::text = (storage.foldername(name))[1] and public.est_is_member(s.org_id))));
drop policy if exists est_kb_bucket_rw on storage.objects;
drop policy if exists "est_kb_bucket_rw" on storage.objects;
drop policy if exists est_kb_bucket_member on storage.objects;
create policy est_kb_bucket_member on storage.objects for all to authenticated
  using (bucket_id = 'est-kb' and (public.est_is_global_admin() or exists (select 1 from public.est_kb_docs d where d.file_path = name and public.est_is_member(d.org_id))))
  with check (bucket_id = 'est-kb' and (public.est_is_global_admin() or exists (select 1 from public.est_kb_docs d where d.file_path = name and public.est_is_member(d.org_id))));

-- ── a new org starts with a copy of a library (rules + catalog + norms + knowledge docs) — global admin only ──
create or replace function public.est_copy_library(src uuid, dst uuid, what text[] default array['rules','catalog','norms','kb']) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n_rules int := 0; n_items int := 0; n_norms int := 0; n_kb int := 0;
begin
  if not public.est_is_global_admin() then raise exception 'global admin only'; end if;
  if 'rules' = any(what) then
    insert into public.est_rules (org_id, name, rule_type, match_text, match_category, params, notes, active, sort)
      select dst, name, rule_type, match_text, match_category, params, notes, active, sort from public.est_rules where org_id = src;
    get diagnostics n_rules = row_count;
  end if;
  if 'catalog' = any(what) then   -- catalog ids are Procore's; copies get fresh ids above the current maximum
    insert into public.est_catalog_items (id, org_id, folder_path, name, description, item_type, is_custom, unit, unit_cost, unit_labor_min, unit_labor_cost, unit_labor_rate, waste_pct, manufacturer, catalog_number, supplier)
      select (select coalesce(max(id), 0) from public.est_catalog_items) + row_number() over (order by id), dst, folder_path, name, description, item_type, is_custom, unit, unit_cost, unit_labor_min, unit_labor_cost, unit_labor_rate, waste_pct, manufacturer, catalog_number, supplier
      from public.est_catalog_items where org_id = src;
    get diagnostics n_items = row_count;
  end if;
  if 'norms' = any(what) then
    insert into public.est_norms (org_id, kind, item, unit, unit_cost, labor_hrs, samples, projects, p25_cost, p75_cost, p25_hrs, p75_hrs, source)
      select dst, kind, item, unit, unit_cost, labor_hrs, samples, projects, p25_cost, p75_cost, p25_hrs, p75_hrs, source from public.est_norms where org_id = src
      on conflict do nothing;
    get diagnostics n_norms = row_count;
  end if;
  if 'kb' = any(what) then
    insert into public.est_kb_docs (org_id, title, org, kind, pages, notes, file_path, chunks)
      select dst, title, org, kind, pages, notes, file_path, chunks from public.est_kb_docs where org_id = src and kind = 'note';
    get diagnostics n_kb = row_count;
  end if;
  return jsonb_build_object('rules', n_rules, 'catalog', n_items, 'norms', n_norms, 'kb', n_kb);
end $$;

-- cost per org: what the reads cost, by month
create or replace view public.est_org_cost as
  select s.org_id, date_trunc('month', p.started_at) as month, count(*) as pages, round(sum(coalesce(p.cost, 0))::numeric, 2) as cost
  from public.ai_est_pages p join public.ai_est_sessions s on s.id = p.session_id
  group by 1, 2;

select 'est-multi-tenant ok' as status, (select count(*) from public.est_org_members) as members;

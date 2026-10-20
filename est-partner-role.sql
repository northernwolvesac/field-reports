-- est-partner-role.sql — design-partner accounts (2026-10-19, follows est-multi-tenant.sql)
-- A partner signs up like anyone (role 'tech'), an org owner invites the e-mail; the first visit claims the invite and turns the
-- profile into role 'partner': a role no NWAC data policy lists (projects, reports, Bid Board, estimates stay closed), while the
-- estimating product pages admit it through org membership. Re-runnable.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('tech','foreman','pm','apm','lead_pm','project_manager','manager','admin','pm_limited','estimator','partner'));

-- claiming an invite into a non-NWAC org makes a plain (tech) account a partner account
create or replace function public.est_claim_invites() returns int
language plpgsql security definer set search_path = public as $$
declare n int := 0; r record; em text; cur_role text;
begin
  select email, role into em, cur_role from public.profiles where id = auth.uid();
  if em is null then return 0; end if;
  for r in select * from public.est_org_invites where lower(email) = lower(em) and claimed_at is null loop
    insert into public.est_org_members (org_id, user_id, role) values (r.org_id, auth.uid(), r.role) on conflict (org_id, user_id) do nothing;
    update public.est_org_invites set claimed_at = now() where id = r.id;
    if r.org_id <> '11111111-1111-4111-8111-111111111111' and coalesce(cur_role, 'tech') = 'tech' then
      update public.profiles set role = 'partner' where id = auth.uid(); cur_role := 'partner';
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;

-- the NWAC org owns the Bid Board / estimates / takeoff; other orgs only get the estimator product
update public.est_orgs set settings = coalesce(settings, '{}'::jsonb) || '{"bid_board": true}'::jsonb where id = '11111111-1111-4111-8111-111111111111';

-- partners read their own profile row like everyone (profiles_select policy already allows all authenticated)
select 'est-partner-role ok' as status;

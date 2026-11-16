-- ============================================================================
-- Service & Maintenance CRM (2026-11-16, Russ): proposals, quotes and maintenance agreements, the visit calendar,
-- follow-ups and a daily 8 AM reminder e-mail. Page: service.html. Re-runnable (idempotent).
--   svc_contracts — one row per proposal, quote or agreement (linked to customers)
--   svc_visits    — planned / scheduled / done visits of a contract (linked to schedule_entries and reports)
--   svc_tasks     — reminders and follow-ups (per customer and / or contract)
--   svc_settings  — single row: who gets the daily e-mail, lead / follow-up / renewal windows, digest token
-- svc_daily_digest(token) is called by a Google Apps Script every morning at 8 AM New York time
-- (generated on service.html → ⚙ Settings → "Daily 8 AM e-mail"), same pattern as compliance_daily_digest.
-- ============================================================================

create table if not exists public.svc_contracts (
  id                uuid primary key default gen_random_uuid(),
  customer_id       uuid references public.customers(id) on delete set null,
  internal_no       text unique,                -- P-YYYY-NNNN (null for legacy)
  client_no         text unique,                -- the client's reference, e.g. SIH-MAINT-02, UHC-01 (seed upserts by it)
  kind              text not null default 'maint' check (kind in ('maint','repair','project','survey')),
  site_name         text,
  site_address      text,
  plan              text check (plan in ('preventive','priority','signature','legacy','other')),
  visits_per_year   int check (visits_per_year is null or visits_per_year between 0 and 52),
  annual_price      numeric(14,2),
  price_note        text,
  billing           text check (billing in ('semi-annual','quarterly','monthly','annual','per-visit')),
  stage             text not null default 'draft' check (stage in ('draft','sent','negotiation','signed','active','lost','cancelled','expired','superseded')),
  sent_date         date,
  signed_date       date,
  start_date        date,
  end_date          date,
  renewal_date      date,
  escalator_pct     numeric(5,2) default 2,
  client_signed     boolean not null default false,
  nwac_signed       boolean not null default false,
  doc_url           text,                       -- Drive / file link of the signed document or proposal
  doc_name          text,
  contact_name      text,
  contact_email     text,
  contact_phone     text,
  gc_name           text,                       -- referral route (GC close-outs)
  gc_contact        text,
  lost_reason       text,
  notes             text,
  next_action       text,                       -- the follow-up shown in lists
  next_action_date  date,
  created_by        uuid references public.profiles(id) on delete set null,
  created_by_name   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_svc_contracts_customer on public.svc_contracts (customer_id);
create index if not exists idx_svc_contracts_stage    on public.svc_contracts (stage);

create table if not exists public.svc_visits (
  id                 uuid primary key default gen_random_uuid(),
  contract_id        uuid not null references public.svc_contracts(id) on delete cascade,
  visit_no           int,
  label              text,                      -- e.g. "Visit 2 of 3 — heating prep"
  due_month          date,                      -- first day of the month the visit is due
  scheduled_date     date,
  status             text not null default 'planned' check (status in ('planned','scheduled','done','skipped','cancelled')),
  schedule_entry_id  uuid references public.schedule_entries(id) on delete set null,
  report_id          uuid references public.reports(id) on delete set null,
  invoice_no         text,
  invoiced           boolean not null default false,
  notes              text,
  done_date          date,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_svc_visits_contract on public.svc_visits (contract_id, due_month);
create index if not exists idx_svc_visits_due      on public.svc_visits (due_month) where status in ('planned','scheduled');

create table if not exists public.svc_tasks (
  id               uuid primary key default gen_random_uuid(),
  customer_id      uuid references public.customers(id) on delete set null,
  contract_id      uuid references public.svc_contracts(id) on delete cascade,
  title            text not null,
  kind             text not null default 'follow_up' check (kind in ('follow_up','call','email','renewal','invoice','visit','other')),
  due_date         date,
  assignee         text,                        -- name or e-mail
  status           text not null default 'open' check (status in ('open','done')),
  done_at          timestamptz,
  notes            text,
  created_by       uuid references public.profiles(id) on delete set null,
  created_by_name  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_svc_tasks_open     on public.svc_tasks (due_date) where status = 'open';
create index if not exists idx_svc_tasks_contract on public.svc_tasks (contract_id);

create table if not exists public.svc_settings (
  id               int primary key default 1 check (id = 1),
  notify_emails    text not null default 'ruslan@northernwolvesac.com, karen@northernwolvesac.com',
  lead_days        int  not null default 14,    -- visits due within N days and not scheduled yet
  followup_days    int  not null default 7,     -- proposals sent N days ago with no reply
  renewal_days     int  not null default 60,    -- agreements renewing within N days
  digest_token     uuid not null default gen_random_uuid(),
  digest_last_run  timestamptz,
  updated_at       timestamptz not null default now()
);
insert into public.svc_settings (id) values (1) on conflict (id) do nothing;

-- touch triggers
create or replace function public.fn_svc_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists trg_svc_contracts_touch on public.svc_contracts;
create trigger trg_svc_contracts_touch before update on public.svc_contracts for each row execute function public.fn_svc_touch();
drop trigger if exists trg_svc_visits_touch on public.svc_visits;
create trigger trg_svc_visits_touch before update on public.svc_visits for each row execute function public.fn_svc_touch();
drop trigger if exists trg_svc_tasks_touch on public.svc_tasks;
create trigger trg_svc_tasks_touch before update on public.svc_tasks for each row execute function public.fn_svc_touch();
drop trigger if exists trg_svc_settings_touch on public.svc_settings;
create trigger trg_svc_settings_touch before update on public.svc_settings for each row execute function public.fn_svc_touch();

-- RLS: the office team (admin, manager, lead_pm, project_manager, apm) reads and writes — same as compliance
do $$
declare t text;
begin
  foreach t in array array['svc_contracts','svc_visits','svc_tasks','svc_settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_office', t);
    execute format($p$create policy %I on public.%I for all to authenticated
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager','lead_pm','project_manager','apm')))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager','lead_pm','project_manager','apm')))$p$, t || '_office', t);
  end loop;
end $$;

-- ============================================================================
-- Daily digest: svc_daily_digest(p_token) → jsonb. Returns nothing without the token from svc_settings (office roles only).
--   visits_due      planned, not scheduled, due month starts within lead_days (and not overdue yet)
--   visits_overdue  planned / scheduled and the due month (or the scheduled date) has passed without "done"
--   visits_week     scheduled for today … today + 7
--   tasks           open, due today or earlier
--   proposals       sent / negotiation and the next action date has come, or (no next action date) sent ≥ followup_days ago
--   renewals        active agreements with renewal_date within renewal_days (or passed)
--   unsigned        active agreements the client has not signed
-- Visits count only on live agreements (stage signed / active).
-- ============================================================================
create or replace function public.svc_daily_digest(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s          public.svc_settings%rowtype;
  today      date := (now() at time zone 'America/New_York')::date;
  v_lead     int;
  v_follow   int;
  v_renew    int;
  v_due      jsonb;
  v_overdue  jsonb;
  v_week     jsonb;
  v_tasks    jsonb;
  v_props    jsonb;
  v_renewals jsonb;
  v_unsigned jsonb;
begin
  select * into s from public.svc_settings where id = 1;
  if not found or s.digest_token is distinct from p_token then raise exception 'invalid token'; end if;
  v_lead := coalesce(s.lead_days, 14); v_follow := coalesce(s.followup_days, 7); v_renew := coalesce(s.renewal_days, 60);

  -- visits on live agreements
  with v as (
    select vi.*, c.internal_no, c.client_no, coalesce(c.site_name, '') as site,
           coalesce(cu.name, c.site_name, c.client_no, c.internal_no, 'Contract') as client,
           (vi.due_month + interval '1 month' - interval '1 day')::date as due_end
    from public.svc_visits vi
    join public.svc_contracts c on c.id = vi.contract_id
    left join public.customers cu on cu.id = c.customer_id
    where c.stage in ('signed', 'active') and vi.status in ('planned', 'scheduled')
  )
  select
    coalesce((select jsonb_agg(jsonb_build_object('contract_id', contract_id, 'client', client, 'site', site, 'internal_no', internal_no, 'client_no', client_no,
                'visit_no', visit_no, 'label', label, 'due_month', due_month) order by due_month, client)
              from v where status = 'planned' and scheduled_date is null and due_month is not null
                and due_month <= today + v_lead and due_end >= today), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('contract_id', contract_id, 'client', client, 'site', site, 'internal_no', internal_no, 'client_no', client_no,
                'visit_no', visit_no, 'label', label, 'due_month', due_month, 'scheduled_date', scheduled_date, 'status', status) order by coalesce(scheduled_date, due_end), client)
              from v where coalesce(scheduled_date, due_end) < today), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('contract_id', contract_id, 'client', client, 'site', site, 'internal_no', internal_no, 'client_no', client_no,
                'visit_no', visit_no, 'label', label, 'scheduled_date', scheduled_date) order by scheduled_date, client)
              from v where status = 'scheduled' and scheduled_date between today and today + 7), '[]'::jsonb)
  into v_due, v_overdue, v_week;

  select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'kind', t.kind, 'due_date', t.due_date, 'assignee', t.assignee,
           'contract_id', t.contract_id, 'client', coalesce(cu.name, cu2.name, c.site_name, ''), 'internal_no', c.internal_no, 'client_no', c.client_no)
           order by t.due_date, t.title), '[]'::jsonb)
    into v_tasks
  from public.svc_tasks t
  left join public.svc_contracts c on c.id = t.contract_id
  left join public.customers cu on cu.id = t.customer_id
  left join public.customers cu2 on cu2.id = c.customer_id
  where t.status = 'open' and t.due_date is not null and t.due_date <= today;

  select coalesce(jsonb_agg(jsonb_build_object('contract_id', c.id, 'client', coalesce(cu.name, c.site_name, c.client_no, c.internal_no, 'Contract'), 'site', c.site_name,
           'internal_no', c.internal_no, 'client_no', c.client_no, 'stage', c.stage, 'sent_date', c.sent_date, 'annual_price', c.annual_price,
           'next_action', c.next_action, 'next_action_date', c.next_action_date, 'contact_name', c.contact_name, 'contact_email', c.contact_email)
           order by coalesce(c.next_action_date, c.sent_date + v_follow), c.sent_date), '[]'::jsonb)
    into v_props
  from public.svc_contracts c left join public.customers cu on cu.id = c.customer_id
  where c.stage in ('sent', 'negotiation')
    and ((c.next_action_date is not null and c.next_action_date <= today)
      or (c.next_action_date is null and c.sent_date is not null and c.sent_date + v_follow <= today));

  select coalesce(jsonb_agg(jsonb_build_object('contract_id', c.id, 'client', coalesce(cu.name, c.site_name, c.client_no, c.internal_no, 'Contract'), 'site', c.site_name,
           'internal_no', c.internal_no, 'client_no', c.client_no, 'renewal_date', c.renewal_date, 'end_date', c.end_date, 'annual_price', c.annual_price)
           order by c.renewal_date), '[]'::jsonb)
    into v_renewals
  from public.svc_contracts c left join public.customers cu on cu.id = c.customer_id
  where c.stage = 'active' and c.renewal_date is not null and c.renewal_date <= today + v_renew;

  select coalesce(jsonb_agg(jsonb_build_object('contract_id', c.id, 'client', coalesce(cu.name, c.site_name, c.client_no, c.internal_no, 'Contract'), 'site', c.site_name,
           'internal_no', c.internal_no, 'client_no', c.client_no, 'start_date', c.start_date, 'annual_price', c.annual_price, 'nwac_signed', c.nwac_signed)
           order by c.start_date nulls last), '[]'::jsonb)
    into v_unsigned
  from public.svc_contracts c left join public.customers cu on cu.id = c.customer_id
  where c.stage = 'active' and not coalesce(c.client_signed, false);

  update public.svc_settings set digest_last_run = now() where id = 1;
  return jsonb_build_object('notify', s.notify_emails, 'today', today, 'lead_days', v_lead, 'followup_days', v_follow, 'renewal_days', v_renew,
    'visits_due', v_due, 'visits_overdue', v_overdue, 'visits_week', v_week, 'tasks', v_tasks,
    'proposals', v_props, 'renewals', v_renewals, 'unsigned', v_unsigned);
end $$;

revoke all on function public.svc_daily_digest(uuid) from public;
grant execute on function public.svc_daily_digest(uuid) to anon, authenticated;

select (select count(*) from public.svc_contracts) as contracts,
       (select count(*) from public.svc_visits)    as visits,
       (select count(*) from public.svc_tasks)     as tasks;

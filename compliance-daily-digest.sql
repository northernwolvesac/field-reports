-- compliance-daily-digest.sql — daily 8 AM insurance reminder (Russ 10/27/2026).
-- A Google Apps Script (generated on compliance.html → ⚙ Requirements → "Daily reminder") calls compliance_daily_digest(token) every
-- morning at 8 AM New York time and e-mails the list to compliance_settings.notify_emails (Karen) while any current certificate is
-- expired or expires within lead_days. The token lives in compliance_settings (office roles only); the function returns nothing without it.

alter table public.compliance_settings add column if not exists digest_token uuid not null default gen_random_uuid();
alter table public.compliance_settings add column if not exists digest_last_run timestamptz;

create or replace function public.compliance_daily_digest(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s     public.compliance_settings%rowtype;
  today date := (now() at time zone 'America/New_York')::date;
  items jsonb;
begin
  select * into s from public.compliance_settings where id = 1;
  if not found or s.digest_token is distinct from p_token then raise exception 'invalid token'; end if;
  with cur as (   -- the current certificate per company + type = the one with the latest expiry
    select distinct on (d.party_id, d.doc_type) d.party_id, d.doc_type, d.expiration_date
    from public.compliance_docs d join public.compliance_parties p on p.id = d.party_id
    where p.is_active and d.status in ('received', 'approved') and d.expiration_date is not null
      and d.doc_type in ('coi', 'workers_comp', 'disability', 'license') and p.coi_required   -- 'no COI needed for now' = no reminders at all
    order by d.party_id, d.doc_type, d.expiration_date desc
  )
  select coalesce(jsonb_agg(jsonb_build_object('company', p.name, 'email', p.email, 'type', c.doc_type, 'expires', c.expiration_date,
           'asap', coalesce(p.notes, '') ~* 'asap') order by c.expiration_date), '[]'::jsonb)
    into items
  from cur c join public.compliance_parties p on p.id = c.party_id
  where c.expiration_date <= today + coalesce(s.lead_days, 30);
  update public.compliance_settings set digest_last_run = now() where id = 1;
  return jsonb_build_object('notify', s.notify_emails, 'lead_days', coalesce(s.lead_days, 30), 'today', today, 'items', items);
end $$;

revoke all on function public.compliance_daily_digest(uuid) from public;
grant execute on function public.compliance_daily_digest(uuid) to anon, authenticated;

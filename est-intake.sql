-- est-intake.sql — e-mail intake for the AI Estimator (2026-10-21)
-- A bid invitation e-mailed (or just labelled in Gmail) with drawings becomes an AI Estimator session of the organisation that owns the
-- intake token. A Google Apps Script on the mailbox calls the Edge Function ai-estimator (actions intake_*) with the token; the function
-- creates the session + file rows and hands out signed upload URLs, the script uploads the PDFs straight to Storage.
-- Tokens are generated here (shown once, only the SHA-256 is stored). Re-runnable.

create table if not exists public.est_intake_tokens (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.est_orgs(id) on delete cascade,
  token_hash    text not null unique,
  label         text,                       -- "bids@ mailbox", "Ruslan's Gmail label"
  notify_emails text,                       -- who the script e-mails when a bid lands (comma separated)
  created_by    uuid default auth.uid(),
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);

create table if not exists public.est_intake_log (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.est_orgs(id) on delete cascade,
  token_id    uuid references public.est_intake_tokens(id) on delete set null,
  message_id  text not null,
  from_email  text,
  subject     text,
  session_id  uuid references public.ai_est_sessions(id) on delete set null,
  files       int not null default 0,
  skipped     jsonb,                        -- attachments left out (images, CAD, too small, too big) with the reason
  links       jsonb,                        -- links found in the e-mail (Procore / Dropbox / WeTransfer …)
  status      text not null default 'received',   -- received | ready | failed
  note        text,
  created_at  timestamptz not null default now(),
  unique (org_id, message_id)
);
create index if not exists est_intake_log_org on public.est_intake_log(org_id, created_at desc);

alter table public.est_intake_tokens enable row level security;
alter table public.est_intake_log enable row level security;
drop policy if exists est_intake_tokens_admin on public.est_intake_tokens;
create policy est_intake_tokens_admin on public.est_intake_tokens for select to authenticated
  using (public.est_is_global_admin() or public.est_org_role(org_id) in ('owner', 'admin'));
drop policy if exists est_intake_log_member on public.est_intake_log;
create policy est_intake_log_member on public.est_intake_log for select to authenticated
  using (public.est_is_global_admin() or public.est_is_member(org_id));
-- writes go through the functions below and the Edge Function (service role); no direct insert / update / delete policies

-- a new token for an organisation (owner / admin / global admin): returns the plain token ONCE, stores only its hash
create or replace function public.est_intake_create_token(p_org uuid, p_label text default null, p_notify text default null) returns text
language plpgsql security definer set search_path = public as $$
declare t text;
begin
  if not (public.est_is_global_admin() or public.est_org_role(p_org) in ('owner', 'admin')) then raise exception 'Only an owner or admin of the organisation can create an intake token'; end if;
  t := 'nwi_' || replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into public.est_intake_tokens (org_id, token_hash, label, notify_emails)
    values (p_org, encode(sha256(convert_to(t, 'utf8')), 'hex'), nullif(trim(p_label), ''), nullif(trim(p_notify), ''));
  return t;
end $$;

create or replace function public.est_intake_revoke(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare o uuid;
begin
  select org_id into o from public.est_intake_tokens where id = p_id;
  if o is null then return; end if;
  if not (public.est_is_global_admin() or public.est_org_role(o) in ('owner', 'admin')) then raise exception 'Only an owner or admin of the organisation can revoke an intake token'; end if;
  update public.est_intake_tokens set revoked_at = now() where id = p_id and revoked_at is null;
end $$;

grant execute on function public.est_intake_create_token(uuid, text, text) to authenticated;
grant execute on function public.est_intake_revoke(uuid) to authenticated;

select 'est-intake ok' as status;

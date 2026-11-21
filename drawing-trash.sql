-- ═══════════════════════════════════════════════════════════════════
-- drawing-trash.sql — run once in the Supabase SQL editor (Russ, 11/21/2026)
--
-- Trash for bid drawings. "Delete" on a drawing (Bid Board → project → Documents) used to
-- delete the estimate_drawings row — its takeoff marks went with it (ON DELETE CASCADE)
-- and the PDF was removed from storage (The NOW 11/21: a whole takeoff lost).
--
-- Now the app calls est_trash_drawing(): the drawing row + every mark drawn on it (all
-- estimate versions) are saved in estimate_drawings_trash, then the row is deleted. The
-- PDF stays in storage. est_restore_drawing() puts the row and the marks back with their
-- original ids (marks on a layer deleted in the meantime are skipped). After 30 days
-- est_trash_purge() drops the snapshot and hands the app the storage paths to remove.
--
-- Until this file is run the app keeps the old behaviour (permanent delete with the warning).
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.estimate_drawings_trash (
  id            uuid primary key default gen_random_uuid(),
  drawing_id    uuid not null,
  estimate_id   uuid not null,                       -- the root estimate the drawing belonged to
  filename      text,
  storage_path  text,
  page_count    integer,
  drawing       jsonb not null,                      -- the whole estimate_drawings row
  measurements  jsonb not null default '[]'::jsonb,  -- every estimate_measurements row on it
  mark_count    integer not null default 0,
  deleted_by    uuid references public.profiles(id) on delete set null,
  deleted_at    timestamptz not null default now()
);
create index if not exists estimate_drawings_trash_est on public.estimate_drawings_trash(estimate_id, deleted_at desc);

alter table public.estimate_drawings_trash enable row level security;
drop policy if exists estimate_drawings_trash_rw on public.estimate_drawings_trash;
create policy estimate_drawings_trash_rw on public.estimate_drawings_trash
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid()
                 and p.role in ('admin','manager','lead_pm','project_manager','apm','estimator')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid()
                      and p.role in ('admin','manager','lead_pm','project_manager','apm','estimator')));

-- move a drawing (and its marks) to the trash; security invoker → the caller's RLS applies
create or replace function public.est_trash_drawing(p_id uuid) returns uuid
language plpgsql security invoker set search_path = public as $$
declare d public.estimate_drawings; ms jsonb; n integer; tid uuid; k integer;
begin
  select * into d from public.estimate_drawings where id = p_id;
  if not found then raise exception 'Drawing not found or no permission'; end if;
  select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb), count(*) into ms, n
    from public.estimate_measurements m where m.drawing_id = p_id;
  insert into public.estimate_drawings_trash(drawing_id, estimate_id, filename, storage_path, page_count, drawing, measurements, mark_count, deleted_by)
    values (d.id, d.estimate_id, d.filename, d.storage_path, d.page_count, to_jsonb(d), ms, n, auth.uid())
    returning id into tid;
  delete from public.estimate_drawings where id = p_id;
  get diagnostics k = row_count;
  if k = 0 then raise exception 'Drawing was not deleted (no permission)'; end if;   -- rolls the snapshot back too
  return tid;
end $$;

-- put a trashed drawing back with its marks (same ids, so the takeoff and the estimate lines pick them up again)
create or replace function public.est_restore_drawing(p_trash uuid) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare t public.estimate_drawings_trash; n integer;
begin
  select * into t from public.estimate_drawings_trash where id = p_trash;
  if not found then raise exception 'Not in the trash (already restored or purged)'; end if;
  if exists (select 1 from public.estimate_drawings where id = t.drawing_id) then
    raise exception 'This drawing is already restored';
  end if;
  insert into public.estimate_drawings select * from jsonb_populate_record(null::public.estimate_drawings, t.drawing);
  insert into public.estimate_measurements
    select r.* from jsonb_populate_recordset(null::public.estimate_measurements, t.measurements) r
     where r.layer_id is null or exists (select 1 from public.estimate_takeoff_layers l where l.id = r.layer_id);
  get diagnostics n = row_count;
  delete from public.estimate_drawings_trash where id = p_trash;
  return jsonb_build_object('drawing_id', t.drawing_id, 'marks', n, 'skipped', greatest(t.mark_count - n, 0));
end $$;

-- drop snapshots older than 30 days (or one item now: p_id) → storage paths no row references any more
create or replace function public.est_trash_purge(p_id uuid default null) returns setof text
language plpgsql security invoker set search_path = public as $$
declare paths text[];
begin
  with gone as (
    delete from public.estimate_drawings_trash
     where (p_id is not null and id = p_id) or (p_id is null and deleted_at < now() - interval '30 days')
    returning storage_path)
  select array_agg(distinct storage_path) into paths from gone;
  return query
    select p from unnest(coalesce(paths, '{}'::text[])) p
     where p is not null
       and not exists (select 1 from public.estimate_drawings d where d.storage_path = p)
       and not exists (select 1 from public.estimate_drawings_trash t where t.storage_path = p);
end $$;

grant execute on function public.est_trash_drawing(uuid), public.est_restore_drawing(uuid), public.est_trash_purge(uuid) to authenticated;

-- check: select * from public.estimate_drawings_trash order by deleted_at desc;

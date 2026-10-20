alter table public.aia_projects add column if not exists client_pos jsonb;
select count(*) as contracts, count(client_pos) as with_pos from public.aia_projects;
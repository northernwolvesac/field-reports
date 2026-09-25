-- 2026-09-25: Prime Contracts / AIA billing is financial - only office roles can read it (technicians get no rows).
-- Applied in the Supabase SQL editor; replaces the old "<table>_read ... using (true)" policies from aia-billing-schema.sql.
do $$
declare t text;
begin
  foreach t in array array['aia_projects','aia_applications','aia_change_orders','aia_line_items','aia_payments','aia_sov_items'] loop
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format($p$create policy %I on public.%I for select to authenticated using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['admin','manager','lead_pm','project_manager','apm'])))$p$, t || '_read', t);
  end loop;
end $$;

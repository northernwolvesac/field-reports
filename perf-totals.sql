-- ═══════════════════════════════════════════════════════════════════════════
-- Speed: store each estimate's total on the estimate (2026-09-29)
-- The Bid Board used to download EVERY line item of every estimate (30,000+ rows, ~6 MB, ~14 sequential requests) just to add up
-- the "Total Sales" column. With the total stored on the estimate the list needs one small query.
-- The Estimating / Takeoff pages keep it current (the estimate strip writes it after every change).
-- Run once in Supabase → SQL Editor (safe to re-run).
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.estimates
  add column if not exists total_sales numeric(14,2),
  add column if not exists line_count  integer;

-- Writing only the stored total must not move the estimate in the "Updated" ordering of the Bid Board.
create or replace function public.fn_estimating_touch()
returns trigger language plpgsql as $$
begin
  if tg_table_name = 'estimates' and tg_op = 'UPDATE'
     and (to_jsonb(new) - 'total_sales' - 'line_count' - 'updated_at')
       = (to_jsonb(old) - 'total_sales' - 'line_count' - 'updated_at') then
    new.updated_at := old.updated_at;
    return new;
  end if;
  new.updated_at := now();
  return new;
end $$;

select count(*) as estimates, count(total_sales) as with_total from public.estimates;

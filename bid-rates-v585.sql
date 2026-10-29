-- v585 (10/29/2026, Ruslan): company bid standard OH&P 30 %, labor $65/h; prevailing wage $175/h is the estimate's
-- "Prevailing wage" switch (Estimate tab, next to Global labor cost; flag in estimates.settings.prevailing_wage).
-- New estimates already get these rates from the app (est-totals.js NW_EST_STD / nwEstStdRow on every insert of a new bid);
-- this only aligns the column defaults for any other insert path. Saved estimates keep the rates stored on them, so bids
-- already submitted do not change. Run once in the Supabase SQL editor.
alter table public.estimates alter column labor_rate set default 65.00;
alter table public.estimates alter column overhead_pct set default 0.30000;

-- Release retainage per invoice line (Prime Contracts → Invoice → Detail → "Release retainage").
-- Share of the line's retainage released as of that invoice: 0 = all held, 1 = all released. Carried to later invoices.
alter table public.aia_line_items add column if not exists retainage_release_pct numeric not null default 0;
comment on column public.aia_line_items.retainage_release_pct is 'Share of this line''s retainage released as of this invoice (0-1)';

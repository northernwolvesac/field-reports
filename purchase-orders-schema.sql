-- Purchase Orders (po.html / purchase-orders.html), 2026-09-27.
-- One row per PO. The PDF package (PO 2 pages + vendor quote + email copy) lives in Google Drive twice:
--   NW Projects/<project>/Purchase Orders/<file>   (drive_id / drive_url)
--   NW Projects/Purchase Orders/<file>             (general folder, general_drive_id / general_drive_url)
-- Numbers continue Karen's sequence: NWAC1300 is the first one made in the app (last Excel PO = NWAC1299).

create table if not exists public.purchase_orders (
  id                uuid primary key default gen_random_uuid(),
  seq               int  not null,                       -- 1300, 1301 …
  po_number         text not null,                       -- 'NWAC1300-SF' (seq + job code)
  revision          int  not null default 0,
  status            text not null default 'draft',       -- draft | saved | sent | acknowledged | void | legacy
  project_id        uuid references public.projects(id) on delete set null,
  project_name      text,
  project_address   text,
  job_code          text,                                -- 'SF', 'SRDS' … (projects.short_code)
  gc_client         text,
  po_date           date not null default current_date,
  vendor_id         uuid references public.vendors(id) on delete set null,
  vendor_name       text not null,
  vendor_code       text,                                -- 'BUSH', 'ADE' … used in the file name
  vendor_attn       text,
  vendor_email      text,
  vendor_phone      text,
  vendor_address    text,
  quote_ref         text,
  items             jsonb not null default '[]'::jsonb,  -- [{no, description, details[], qty, unit, unit_price, amount}]
  subtotal          numeric(14,2) not null default 0,
  tax_rate          numeric(6,3),                        -- null = "NY sales tax not included"
  tax_amount        numeric(14,2) not null default 0,
  freight           numeric(14,2) not null default 0,
  total             numeric(14,2) not null default 0,
  tax_note          text,
  ship_to           text,
  lead_time         text,
  delivery_contact  text,
  submittals_due    text,
  submittals_to     text,
  invoices_to       text default 'invoicing@northernwolvesac.com',
  order_notes       jsonb not null default '[]'::jsonb,  -- ["This PO covers …", …]
  issued_by_name    text,
  issued_by_title   text,
  issued_by_email   text,
  issued_by_phone   text,
  distribution      text,
  email_copy        text,                                -- pasted vendor email / correspondence printed as an extra page
  attachments       jsonb not null default '[]'::jsonb,  -- [{name, pages, size}] merged after page 2
  file_name         text,
  drive_id          text,                                -- copy in the project folder
  drive_url         text,
  drive_folder      text,
  general_drive_id  text,                                -- copy in NW Projects/Purchase Orders
  general_drive_url text,
  sent_to           text,
  sent_at           timestamptz,
  legacy_file       text,                                -- original Excel file name (imported history)
  data              jsonb,
  created_by        uuid references public.profiles(id) on delete set null,
  created_by_name   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (seq, revision)
);
create index if not exists idx_po_project on public.purchase_orders(project_id);
create index if not exists idx_po_vendor  on public.purchase_orders(vendor_name);
create index if not exists idx_po_seq     on public.purchase_orders(seq desc);

alter table public.purchase_orders enable row level security;
drop policy if exists po_read on public.purchase_orders;
create policy po_read on public.purchase_orders for select to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['admin','manager','lead_pm','project_manager','apm'])));
drop policy if exists po_write on public.purchase_orders;
create policy po_write on public.purchase_orders for all to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['admin','manager','lead_pm','project_manager','apm'])))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['admin','manager','lead_pm','project_manager','apm'])));

-- project_files may now hold PO packages
alter table public.project_files drop constraint if exists project_files_category_check;
alter table public.project_files add constraint project_files_category_check check (category in (
  'drawings','quotes','rfi','specs','permits','submittals','leveling_sheet','close_out',
  'photos','contracts','manuals','warranties','reports','other','change-orders','purchase-orders'));

select 'purchase_orders ready' as result;

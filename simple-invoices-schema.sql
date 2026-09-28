-- Simple invoices (2026-09-27): clients like JRM Construction Management do not use AIA G702/G703.
-- A Prime Contract with form_variant = 'simple' bills one amount per invoice and prints an invoice
-- in the Purchase Order style (invoicing.html → exportSimplePdf).

ALTER TABLE aia_projects DROP CONSTRAINT IF EXISTS aia_projects_form_variant_check;
ALTER TABLE aia_projects ADD CONSTRAINT aia_projects_form_variant_check CHECK (form_variant IN ('owner','subcontractor','simple'));

ALTER TABLE aia_projects
  ADD COLUMN IF NOT EXISTS job_number   TEXT,   -- the client's job number ("JOB Number: 40-25-242")
  ADD COLUMN IF NOT EXISTS client_attn  TEXT,   -- "ATTN.: Accounts Payable"
  ADD COLUMN IF NOT EXISTS signer_name  TEXT,   -- defaults to Leonid Leonidov
  ADD COLUMN IF NOT EXISTS signer_title TEXT;   -- defaults to General Manager

ALTER TABLE aia_applications
  ADD COLUMN IF NOT EXISTS po_number TEXT,      -- the client's PO for this invoice (JRM issues one per change order)
  ADD COLUMN IF NOT EXISTS memo      TEXT;      -- description printed on the simple invoice

SELECT 'simple invoices ready' AS result;

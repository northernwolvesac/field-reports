-- ═══════════════════════════════════════════════════════════════════
-- AIA Billing v2 — fields needed to reproduce Procore's G702/G703 PDF
-- exactly (September 2026 billing samples).
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE aia_projects
  -- 'owner' = TO OWNER/CLIENT + VIA ARCHITECT + Architect's Certificate block
  -- 'subcontractor' = TO CONTRACTOR / FROM SUBCONTRACTOR / CONTRACT NO, no architect block
  ADD COLUMN IF NOT EXISTS form_variant          TEXT NOT NULL DEFAULT 'owner'
      CHECK (form_variant IN ('owner','subcontractor')),
  ADD COLUMN IF NOT EXISTS project_no            TEXT,            -- "PROJECT NO:" (falls back to projects.short_code)
  ADD COLUMN IF NOT EXISTS contract_no           TEXT,            -- "CONTRACT NO:" (subcontractor variant)
  ADD COLUMN IF NOT EXISTS project_address       TEXT,            -- site address under PROJECT:
  ADD COLUMN IF NOT EXISTS retainage_rate_stored NUMERIC(5,4) NOT NULL DEFAULT 0;  -- Line 5b rate

ALTER TABLE aia_applications
  ADD COLUMN IF NOT EXISTS invoice_no       TEXT,   -- "INVOICE NO:" (usually = application_no)
  ADD COLUMN IF NOT EXISTS certificate_date DATE,   -- subcontractor variant
  ADD COLUMN IF NOT EXISTS submitted_date   DATE;   -- subcontractor variant

-- Contractor address now stored one line per row so the PDF can print it verbatim
ALTER TABLE aia_projects
  ALTER COLUMN contractor_address SET DEFAULT E'55 9th Str., Unit 55A-2\nBrooklyn, New York 11215';

DO $$
DECLARE n int;
BEGIN
  SELECT COUNT(*) INTO n FROM information_schema.columns
   WHERE (table_name='aia_projects' AND column_name IN ('form_variant','project_no','contract_no','project_address','retainage_rate_stored'))
      OR (table_name='aia_applications' AND column_name IN ('invoice_no','certificate_date','submitted_date'));
  RAISE NOTICE 'AIA v2 columns present: % of 8', n;
END $$;

-- Simple invoice billing + sub-prime contracts (2026-10-17)
-- A Prime Contract is either AIA billing (G702/G703) or Simple invoice billing (one amount per invoice, printed like the
-- BOSS / JRM invoices). Clients like JRM issue a separate PO for every change order and want each one billed on its own
-- invoices ("sub-prime contracts"): billing_mode = 'separate' — an invoice then bills ONE sub-contract (the base contract
-- or one approved change order with its client PO) and its previous-invoices / balance are computed within that PO only.
-- Invoice numbers stay one sequence per project (BBP-01, BBP-02 …) — invoice_prefix.

ALTER TABLE aia_projects ADD COLUMN IF NOT EXISTS billing_mode TEXT NOT NULL DEFAULT 'combined';   -- combined | separate
ALTER TABLE aia_projects DROP CONSTRAINT IF EXISTS aia_projects_billing_mode_check;
ALTER TABLE aia_projects ADD CONSTRAINT aia_projects_billing_mode_check CHECK (billing_mode IN ('combined','separate'));
ALTER TABLE aia_projects ADD COLUMN IF NOT EXISTS invoice_prefix TEXT;                               -- "BBP" -> BBP-01, BBP-02 …

ALTER TABLE aia_change_orders ADD COLUMN IF NOT EXISTS po_number TEXT;                               -- the client's PO for this change order

ALTER TABLE aia_applications ADD COLUMN IF NOT EXISTS bill_co_id UUID REFERENCES aia_change_orders(id) ON DELETE SET NULL;  -- the sub-contract this invoice bills; NULL = base contract
CREATE INDEX IF NOT EXISTS idx_aia_applications_bill_co ON aia_applications(bill_co_id);

SELECT 'sub-prime contracts ready' AS result;

-- Change Orders created in the field form (change-order.html) flow into the
-- project's Prime Contract as DRAFT. Billing approves them + sets the
-- approval date; invoices pick up approved COs whose approved_date falls on
-- or before the invoice's billing period end.
ALTER TABLE aia_change_orders
  ADD COLUMN IF NOT EXISTS approved_date        DATE,
  ADD COLUMN IF NOT EXISTS source_report_number TEXT,          -- reports.report_number of the field CO
  ADD COLUMN IF NOT EXISTS line_items           JSONB;         -- [{description, amount}] breakdown for PCO leaf lines

CREATE UNIQUE INDEX IF NOT EXISTS uq_aia_co_source
  ON aia_change_orders(aia_project_id, source_report_number) WHERE source_report_number IS NOT NULL;

-- Existing approved COs: approval date = date initiated (keeps current invoice behaviour)
UPDATE aia_change_orders SET approved_date = COALESCE(review_date, date_initiated)
 WHERE status = 'approved' AND approved_date IS NULL;

-- Field users (techs/PMs) create COs from the form, so allow insert for any
-- authenticated user; status/approval changes stay management-only via the UI.
DROP POLICY IF EXISTS aia_change_orders_insert_any ON aia_change_orders;
CREATE POLICY aia_change_orders_insert_any ON aia_change_orders
  FOR INSERT TO authenticated WITH CHECK (status = 'draft');

SELECT COUNT(*) AS new_cols FROM information_schema.columns
 WHERE table_name='aia_change_orders' AND column_name IN ('approved_date','source_report_number','line_items');

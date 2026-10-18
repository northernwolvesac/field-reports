-- Cost Catalog audit (2026-10-17): price provenance, review flag, price history, usage view.
ALTER TABLE est_catalog_items
  ADD COLUMN IF NOT EXISTS price_source     TEXT,          -- 'Procore 2025-04' | 'supplier quote' | 'estimate 2026-10' | 'verify' …
  ADD COLUMN IF NOT EXISTS price_checked_at DATE,          -- when a person last confirmed unit_cost / labor
  ADD COLUMN IF NOT EXISTS needs_review     BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS est_catalog_price_log (
  id            BIGSERIAL PRIMARY KEY,
  item_id       BIGINT REFERENCES est_catalog_items(id) ON DELETE CASCADE,
  old_cost      NUMERIC(14,4), new_cost      NUMERIC(14,4),
  old_labor_min NUMERIC(14,4), new_labor_min NUMERIC(14,4),
  reason        TEXT,
  changed_by    UUID DEFAULT auth.uid(),
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_est_catalog_price_log_item ON est_catalog_price_log(item_id, changed_at DESC);
ALTER TABLE est_catalog_price_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "est_catalog_price_log_read" ON est_catalog_price_log;
CREATE POLICY "est_catalog_price_log_read" ON est_catalog_price_log FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "est_catalog_price_log_write" ON est_catalog_price_log;
CREATE POLICY "est_catalog_price_log_write" ON est_catalog_price_log FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm')));

-- how often each catalog item was used on estimates (for "last used" / "unused" in the catalog page)
CREATE OR REPLACE VIEW est_catalog_usage AS
  SELECT catalog_item_id AS item_id, COUNT(*) AS n_lines, MAX(created_at) AS last_used
  FROM estimate_line_items WHERE catalog_item_id IS NOT NULL GROUP BY catalog_item_id;

SELECT 'catalog audit ready' AS result;

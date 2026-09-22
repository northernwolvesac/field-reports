-- ═══════════════════════════════════════════════════════════════════
-- Prime Contracts — mirrors Procore's Prime Contract tool
-- (General / Change Orders / Invoices / Payments Received), captured
-- 2026-09-22 from the Snowflake 7 Times Square contract.
--
-- aia_projects      = the Prime Contract (one per project)
-- aia_applications  = Invoices (payment applications)
-- NEW aia_sov_items      = contract Schedule of Values (General tab)
-- NEW aia_change_orders  = PCCO / PCO log (Change Orders tab)
-- NEW aia_payments       = Payments Received tab
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE aia_projects
  ADD COLUMN IF NOT EXISTS contract_number TEXT,
  ADD COLUMN IF NOT EXISTS title           TEXT,
  ADD COLUMN IF NOT EXISTS status          TEXT NOT NULL DEFAULT 'approved'
      CHECK (status IN ('draft','out_for_signature','approved','complete','terminated','void')),
  ADD COLUMN IF NOT EXISTS executed        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS description     TEXT,
  ADD COLUMN IF NOT EXISTS inclusions      TEXT,
  ADD COLUMN IF NOT EXISTS exclusions      TEXT,
  ADD COLUMN IF NOT EXISTS start_date                    DATE,
  ADD COLUMN IF NOT EXISTS estimated_completion_date     DATE,
  ADD COLUMN IF NOT EXISTS substantial_completion_date   DATE,
  ADD COLUMN IF NOT EXISTS actual_completion_date        DATE,
  ADD COLUMN IF NOT EXISTS signed_contract_received_date DATE,
  ADD COLUMN IF NOT EXISTS contract_termination_date     DATE,
  ADD COLUMN IF NOT EXISTS is_private      BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS aia_sov_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aia_project_id UUID NOT NULL REFERENCES aia_projects(id) ON DELETE CASCADE,
  budget_code    TEXT,
  description    TEXT NOT NULL,
  amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aia_sov_contract ON aia_sov_items(aia_project_id, sort_order);

CREATE TABLE IF NOT EXISTS aia_change_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aia_project_id  UUID NOT NULL REFERENCES aia_projects(id) ON DELETE CASCADE,
  number          TEXT NOT NULL,
  pco_number      TEXT,
  revision        INTEGER NOT NULL DEFAULT 0,
  title           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
      CHECK (status IN ('draft','pending','approved','rejected','void')),
  executed        BOOLEAN NOT NULL DEFAULT FALSE,
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  date_initiated  DATE,
  due_date        DATE,
  review_date     DATE,
  change_reason   TEXT,
  schedule_impact_days INTEGER,
  designated_reviewer  TEXT,
  notes           TEXT,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aia_co_contract ON aia_change_orders(aia_project_id, number);

CREATE TABLE IF NOT EXISTS aia_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aia_project_id  UUID NOT NULL REFERENCES aia_projects(id) ON DELETE CASCADE,
  application_id  UUID REFERENCES aia_applications(id) ON DELETE SET NULL,
  amount          NUMERIC(12,2) NOT NULL,
  date_paid       DATE NOT NULL,
  payment_number  TEXT,
  check_number    TEXT,
  notes           TEXT,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aia_payments_contract ON aia_payments(aia_project_id, date_paid);

DROP TRIGGER IF EXISTS trg_aia_sov_touch ON aia_sov_items;
CREATE TRIGGER trg_aia_sov_touch BEFORE UPDATE ON aia_sov_items FOR EACH ROW EXECUTE FUNCTION fn_estimating_touch();
DROP TRIGGER IF EXISTS trg_aia_co_touch ON aia_change_orders;
CREATE TRIGGER trg_aia_co_touch BEFORE UPDATE ON aia_change_orders FOR EACH ROW EXECUTE FUNCTION fn_estimating_touch();
DROP TRIGGER IF EXISTS trg_aia_pay_touch ON aia_payments;
CREATE TRIGGER trg_aia_pay_touch BEFORE UPDATE ON aia_payments FOR EACH ROW EXECUTE FUNCTION fn_estimating_touch();

ALTER TABLE aia_sov_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE aia_change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE aia_payments      ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['aia_sov_items','aia_change_orders','aia_payments'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_read', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_write', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (true)', t || '_read', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO authenticated ' ||
      'USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN (''admin'',''manager'',''lead_pm'',''project_manager'',''apm''))) ' ||
      'WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN (''admin'',''manager'',''lead_pm'',''project_manager'',''apm'')))',
      t || '_write', t);
  END LOOP;
END $$;

SELECT 'aia_projects new cols' AS what, COUNT(*) AS n FROM information_schema.columns
 WHERE table_name='aia_projects' AND column_name IN ('contract_number','title','status','executed','description','inclusions','exclusions','start_date','is_private')
UNION ALL SELECT 'new tables', COUNT(*) FROM information_schema.tables
 WHERE table_name IN ('aia_sov_items','aia_change_orders','aia_payments');

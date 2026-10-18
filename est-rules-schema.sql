-- Estimating rules (2026-10-18): company rules applied on the Estimating page (est-totals.js nwEstRules, est-rules.html admin).
-- min_charge {min_amount} tops matched lines up to a minimum; pct_add {pct} adds a % of matched material; add_line {amount} adds a
-- fixed amount when a match exists; reminder shows a note. Match = description contains match_text and/or category = match_category.
CREATE TABLE IF NOT EXISTS est_rules (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  rule_type      TEXT NOT NULL CHECK (rule_type IN ('min_charge','pct_add','add_line','reminder')),
  match_text     TEXT,
  match_category TEXT,
  params         JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes          TEXT,
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  sort           INTEGER NOT NULL DEFAULT 0,
  created_by     UUID DEFAULT auth.uid(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE est_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "est_rules_read" ON est_rules;
CREATE POLICY "est_rules_read" ON est_rules FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "est_rules_write" ON est_rules;
CREATE POLICY "est_rules_write" ON est_rules FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm')));
-- seed (Russ 2026-10-18): chemical cleaning $500 per coil / unit, minimum $1,500 per job, units over 10 T double
INSERT INTO est_rules (name, rule_type, match_text, params, notes, sort)
SELECT 'Chemical cleaning — minimum charge', 'min_charge', 'chemical cleaning', '{"min_amount": 1500}'::jsonb, 'Minimum $1,500 per job even when the job has one unit (Russ 2026-10-18).', 10
WHERE NOT EXISTS (SELECT 1 FROM est_rules WHERE name = 'Chemical cleaning — minimum charge');
INSERT INTO est_rules (name, rule_type, match_text, params, notes, sort)
SELECT 'Chemical cleaning — units over 10 T', 'reminder', 'chemical cleaning', '{}'::jsonb, 'Units larger than 10 T are double: use the "over 10 T" catalog item ($1,000 per coil / unit).', 11
WHERE NOT EXISTS (SELECT 1 FROM est_rules WHERE name = 'Chemical cleaning — units over 10 T');
SELECT 'est rules ready' AS result;

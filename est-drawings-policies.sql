-- ═══════════════════════════════════════════════════════════════════
-- est-drawings-policies.sql — run once in Supabase SQL editor (Russ)
--
-- 1) Let the 'estimator' role (Kastriot / Alikhan — PC.MGMT_ROLES in procore-ui.js)
--    upload / rename / delete drawings and draw measurements + takeoff layers.
--    takeoff-schema.sql and takeoff-v2-schema.sql only allow
--    admin/manager/lead_pm/project_manager/apm, so EstDrawings.upload() fails every
--    file for an estimator with an RLS error and rename/remove/detectSheets throw
--    "no permission". Storage policies on bucket 'estimate-drawings' already allow
--    all authenticated users — no change there.
--
-- 2) One-time data move: drawings are now keyed by the ROOT estimate
--    (est.parent_estimate_id || est.id — plan §8). Rows uploaded by the old
--    takeoff.html against a VERSION id would disappear from the root-keyed list.
--    Move them to the root (when the root does not already have the same file).
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. write policies incl. 'estimator' ──────────────────────────────
DROP POLICY IF EXISTS "estimate_drawings_write" ON estimate_drawings;
CREATE POLICY "estimate_drawings_write" ON estimate_drawings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
                 AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
                      AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')));

DROP POLICY IF EXISTS "estimate_measurements_write" ON estimate_measurements;
CREATE POLICY "estimate_measurements_write" ON estimate_measurements
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
                 AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
                      AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')));

-- estimate_takeoff_layers only exists after takeoff-v2-schema.sql has been run
DO $$
BEGIN
  IF to_regclass('public.estimate_takeoff_layers') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "estimate_takeoff_layers_write" ON estimate_takeoff_layers';
    EXECUTE $p$
      CREATE POLICY "estimate_takeoff_layers_write" ON estimate_takeoff_layers
        FOR ALL TO authenticated
        USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
                       AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')))
        WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
                            AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')))
    $p$;
    RAISE NOTICE 'estimate_takeoff_layers_write now includes estimator';
  ELSE
    RAISE NOTICE 'estimate_takeoff_layers not found — run takeoff-v2-schema.sql first, then re-run this file';
  END IF;
END $$;

-- ── 2. move version-keyed drawings to their root estimate ────────────
-- Preview first (what would move):
--   SELECT d.id, d.filename, d.estimate_id AS version_id, e.parent_estimate_id AS root_id
--   FROM estimate_drawings d JOIN estimates e ON e.id = d.estimate_id
--   WHERE e.parent_estimate_id IS NOT NULL;
UPDATE estimate_drawings d
   SET estimate_id = e.parent_estimate_id
  FROM estimates e
 WHERE d.estimate_id = e.id
   AND e.parent_estimate_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM estimate_drawings r
                    WHERE r.estimate_id = e.parent_estimate_id
                      AND r.storage_path = d.storage_path);

-- Remaining rows still on a version id are duplicate copies (same storage_path as the
-- root's row, made by BidActions.copyProject). Their estimate_measurements CASCADE on delete,
-- so VERIFY before removing them:
--   SELECT d.id, d.filename, d.estimate_id,
--          (SELECT count(*) FROM estimate_measurements m WHERE m.drawing_id = d.id) AS measurements
--   FROM estimate_drawings d JOIN estimates e ON e.id = d.estimate_id
--   WHERE e.parent_estimate_id IS NOT NULL;
-- then, only for rows with 0 measurements (or after re-pointing their measurements to the root row):
--   DELETE FROM estimate_drawings d USING estimates e
--   WHERE d.estimate_id = e.id AND e.parent_estimate_id IS NOT NULL
--     AND NOT EXISTS (SELECT 1 FROM estimate_measurements m WHERE m.drawing_id = d.id);

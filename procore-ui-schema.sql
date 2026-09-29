-- ═══════════════════════════════════════════════════════════════════
-- Procore-style Estimating UI — schema patch (run once in Supabase → SQL Editor; safe to re-run)
-- Owner: SQL implementer (procore-ui-schema.sql). 2026-09-28: regenerated and MERGED with the
-- estimating.html implementer's additions (estimate_line_items.labor_rate, guarded layer FK,
-- '(Group)' suffix back-fill) so only this file owns the estimating schema patch.
--
-- Collects every column the five estimating pages (bid-board, bid-project, estimating, takeoff,
-- assembly-library) read or write on top of estimating-schema.sql / bid-board-schema.sql /
-- takeoff-v2-schema.sql, plus the Cost Catalog seeds the pages promise by name.
--
-- Prerequisites: estimating-schema.sql (estimates, estimate_line_items, estimate_assemblies,
--   fn_estimating_touch) and bid-board-schema.sql. takeoff-v2-schema.sql is OPTIONAL: every
--   catalog / takeoff-layer section skips itself with a NOTICE until it has been run — re-run
--   this file afterwards and the skipped sections fill in.
--
-- Sections
--   1  estimates.settings (JSONB)                      7  estimate_assemblies → 'NW Assemblies' catalog rows
--   2  estimate_line_items Procore grid columns        8  28 NWAC Standards presets → 'NWAC Standards'
--   3  '(Group)' suffix back-fill → group_name         9  Cost Catalog write policies (incl. 'estimator')
--   4  estimate_takeoff_layers tag / lock / params    10  OPTIONAL, guarded: 'estimator' profile role
--   5  catalog id sequences + touch triggers          11  verify (one NOTICE per item)
--   6  root folders Custom / NWAC Standards / NW Assemblies
--
-- Pages degrade with a banner when this has not been run (estimating.html probes
-- estimates.settings and estimate_line_items.group_name on load).
-- ═══════════════════════════════════════════════════════════════════


-- ─── 1. estimates.settings — single JSONB for every column-less Procore field ───────────
--   pricing_locked, is_default_template, measurement_system, labor_sales_rate, labor_tax_rate,
--   markups[] {id,name,type:'basic'|'compound'|'lump',pct,amount,stage:'pre'|'post',criteria,tax_mapping},
--   manual_groups[] {name,multiplier}, takeoff_groups[], proposal{}, es_settings{individual_labor_rates,round_ea}
ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN estimates.settings IS
  'Procore-style per-estimate settings (estimating.html): pricing_locked, is_default_template, measurement_system, labor_sales_rate, labor_tax_rate, markups[] {id,name,type basic|compound|lump,pct,amount,stage pre|post,criteria,tax_mapping}, manual_groups[] {name,multiplier}, takeoff_groups[], proposal{}, es_settings {individual_labor_rates, round_ea}';


-- ─── 2. estimate_line_items — Procore grid columns ────────────────────────────────────
-- Percent columns are FRACTIONS (0.05 = 5 %), same convention as estimates.overhead_pct / tax_rate.
ALTER TABLE estimate_line_items
  ADD COLUMN IF NOT EXISTS group_name        TEXT,                                -- Manual Group ('Default Group' when null)
  ADD COLUMN IF NOT EXISTS layer_id          UUID,                                -- estimate_takeoff_layers.id (takeoff roll-up ↔ Reset Quantity)
  ADD COLUMN IF NOT EXISTS catalog_item_id   BIGINT,                              -- est_catalog_items.id when picked from the Cost Catalog
  ADD COLUMN IF NOT EXISTS waste_pct         NUMERIC(8,5)  NOT NULL DEFAULT 0,    -- material waste (fraction)
  ADD COLUMN IF NOT EXISTS markup_pct        NUMERIC(8,5)  NOT NULL DEFAULT 0,    -- material markup (fraction)
  ADD COLUMN IF NOT EXISTS labor_markup_pct  NUMERIC(8,5)  NOT NULL DEFAULT 0,    -- labor markup (fraction)
  ADD COLUMN IF NOT EXISTS labor_factor      NUMERIC(8,4)  NOT NULL DEFAULT 1,    -- Difficulty Factor
  ADD COLUMN IF NOT EXISTS labor_rate        NUMERIC(8,2),                        -- per-line rate (only when settings.es_settings.individual_labor_rates)
  ADD COLUMN IF NOT EXISTS is_taxable        BOOLEAN;                             -- NULL = derive from category (equipment/ductwork/pipework, not wet-tap)

-- Grouped grid loads are ORDER BY sort_order inside each Manual Group → 3-column index.
-- An earlier run may have created the 2-column (estimate_id, group_name) version; IF NOT EXISTS
-- would keep it, so drop that one first.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes
              WHERE schemaname = 'public' AND indexname = 'idx_estimate_lines_group'
                AND indexdef NOT LIKE '%sort_order%') THEN
    DROP INDEX idx_estimate_lines_group;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_estimate_lines_group ON estimate_line_items(estimate_id, group_name, sort_order);
CREATE INDEX IF NOT EXISTS idx_estimate_lines_layer ON estimate_line_items(layer_id) WHERE layer_id IS NOT NULL;

-- Soft FK to takeoff layers (only when takeoff-v2-schema.sql has been run)
DO $$
BEGIN
  IF to_regclass('public.estimate_takeoff_layers') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                     WHERE constraint_name = 'estimate_line_items_layer_fk') THEN
    ALTER TABLE estimate_line_items
      ADD CONSTRAINT estimate_line_items_layer_fk
      FOREIGN KEY (layer_id) REFERENCES estimate_takeoff_layers(id) ON DELETE SET NULL;
  END IF;
END $$;


-- ─── 3. Back-fill Manual Group for existing rows ─────────────────────────────────────
-- takeoff.html roll-ups made before group_name existed carry the takeoff group as a ' (Group)' suffix
-- on the description. Adopt the suffix ONLY when it names a real takeoff group of the same estimate
-- (so 'Diffuser (24x24)' or 'RTU-1 (Carrier)' stay in Default Group), strip it from the description
-- in the same statement, then send everything else to 'Default Group'.
DO $$
DECLARE
  n_grp int := 0;
  n_def int := 0;
BEGIN
  IF to_regclass('public.estimate_takeoff_layers') IS NOT NULL THEN
    UPDATE estimate_line_items AS li
       SET group_name  = substring(li.description from '\(([^()]+)\)\s*$'),
           description = regexp_replace(li.description, '\s*\([^()]+\)\s*$', '')
     WHERE li.group_name IS NULL
       AND li.notes LIKE '%[from PDF takeoff]%'
       AND li.description ~ '\([^()]+\)\s*$'
       AND EXISTS (SELECT 1 FROM estimate_takeoff_layers l
                    WHERE l.estimate_id = li.estimate_id
                      AND l.group_name  = substring(li.description from '\(([^()]+)\)\s*$'));
    GET DIAGNOSTICS n_grp = ROW_COUNT;
  END IF;
  UPDATE estimate_line_items
     SET group_name = 'Default Group'
   WHERE group_name IS NULL;
  GET DIAGNOSTICS n_def = ROW_COUNT;
  RAISE NOTICE 'section 3: % takeoff roll-up lines moved to their takeoff group, % lines set to Default Group', n_grp, n_def;
END $$;


-- ─── 4. estimate_takeoff_layers — Tag / lock / extra takeoff params (only if the table exists) ──
DO $$
BEGIN
  IF to_regclass('public.estimate_takeoff_layers') IS NULL THEN
    RAISE NOTICE 'section 4 skipped: estimate_takeoff_layers missing — run takeoff-v2-schema.sql, then re-run this file';
    RETURN;
  END IF;
  ALTER TABLE estimate_takeoff_layers
    ADD COLUMN IF NOT EXISTS tag        TEXT,
    ADD COLUMN IF NOT EXISTS is_locked  BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS params     JSONB;   -- {volume, slope, weight, symbolSize, spacing, height, autoIncrementingLabel}
END $$;


-- ─── 5. Cost Catalog id sequences + updated_at touch triggers ─────────────────────────
-- takeoff-v2-schema.sql declares est_catalog_folders.id / est_catalog_items.id as plain BIGINT PRIMARY KEY
-- (Procore ids). nw-catalog-picker.js supplies its own id (genId() = Date.now()*1000 + rand ≈ 1.8e15),
-- but every SQL seed / import that omits id needs a DEFAULT. Sequences start above the Procore ranges
-- (folders ≈ 2.2e5 → 1,000,000; items ≈ 5.6e14 → max Procore id + 1, at least 100,000,000) and ignore the
-- client-generated ids (≥ 1e15) when positioning, so the three id sources never collide.
DO $$
DECLARE
  next_f bigint;
  next_i bigint;
BEGIN
  IF to_regclass('public.est_catalog_folders') IS NULL OR to_regclass('public.est_catalog_items') IS NULL THEN
    RAISE NOTICE 'section 5 skipped: est_catalog_folders / est_catalog_items missing — run takeoff-v2-schema.sql, then re-run this file';
    RETURN;
  END IF;

  CREATE SEQUENCE IF NOT EXISTS est_catalog_folders_id_seq;
  CREATE SEQUENCE IF NOT EXISTS est_catalog_items_id_seq;

  SELECT GREATEST(COALESCE(MAX(id), 0) + 1, 1000000)
    INTO next_f
    FROM est_catalog_folders
   WHERE id < 1000000000000000;
  SELECT GREATEST(COALESCE(MAX(id), 0) + 1, 100000000)
    INTO next_i
    FROM est_catalog_items
   WHERE id < 1000000000000000;

  PERFORM setval('est_catalog_folders_id_seq', GREATEST(next_f, nextval('est_catalog_folders_id_seq')), false);
  PERFORM setval('est_catalog_items_id_seq',   GREATEST(next_i, nextval('est_catalog_items_id_seq')),   false);

  ALTER TABLE est_catalog_folders ALTER COLUMN id SET DEFAULT nextval('est_catalog_folders_id_seq');
  ALTER TABLE est_catalog_items   ALTER COLUMN id SET DEFAULT nextval('est_catalog_items_id_seq');
  ALTER SEQUENCE est_catalog_folders_id_seq OWNED BY est_catalog_folders.id;
  ALTER SEQUENCE est_catalog_items_id_seq   OWNED BY est_catalog_items.id;

  -- 'Recently updated' sort in the picker must also see rows edited by SQL
  DROP TRIGGER IF EXISTS trg_est_catalog_folders_touch ON est_catalog_folders;
  CREATE TRIGGER trg_est_catalog_folders_touch BEFORE UPDATE ON est_catalog_folders
    FOR EACH ROW EXECUTE FUNCTION fn_estimating_touch();
  DROP TRIGGER IF EXISTS trg_est_catalog_items_touch ON est_catalog_items;
  CREATE TRIGGER trg_est_catalog_items_touch BEFORE UPDATE ON est_catalog_items
    FOR EACH ROW EXECUTE FUNCTION fn_estimating_touch();

  RAISE NOTICE 'section 5: catalog id sequences ready (folders from %, items from %) + touch triggers', next_f, next_i;
END $$;


-- ─── 6. Root folders: Custom (0) · NWAC Standards (1) · NW Assemblies (2) ──────────────
-- Procore's own root 'Custom' (id 223396 in the import) is kept — it is only pinned to sort_order 0 /
-- is_custom. Note the picker's virtual 'Custom' node queries is_custom = true AND folder_id IS NULL
-- (nw-catalog-picker.js), so app-created loose items appear there regardless of the seeded folder.
DO $$
DECLARE
  n_roots int := 0;
BEGIN
  IF to_regclass('public.est_catalog_folders') IS NULL THEN
    RAISE NOTICE 'section 6 skipped: est_catalog_folders missing — run takeoff-v2-schema.sql, then re-run this file';
    RETURN;
  END IF;

  UPDATE est_catalog_folders
     SET is_custom = TRUE, sort_order = 0
   WHERE parent_id IS NULL AND name = 'Custom' AND (is_custom = FALSE OR sort_order <> 0);

  INSERT INTO est_catalog_folders (parent_id, name, path, is_custom, sort_order)
  SELECT NULL, 'Custom', 'Custom', TRUE, 0
   WHERE NOT EXISTS (SELECT 1 FROM est_catalog_folders WHERE parent_id IS NULL AND name = 'Custom');

  INSERT INTO est_catalog_folders (parent_id, name, path, is_custom, sort_order)
  SELECT NULL, 'NWAC Standards', 'NWAC Standards', TRUE, 1
   WHERE NOT EXISTS (SELECT 1 FROM est_catalog_folders WHERE parent_id IS NULL AND name = 'NWAC Standards');

  INSERT INTO est_catalog_folders (parent_id, name, path, is_custom, sort_order)
  SELECT NULL, 'NW Assemblies', 'NW Assemblies', TRUE, 2
   WHERE NOT EXISTS (SELECT 1 FROM est_catalog_folders WHERE parent_id IS NULL AND name = 'NW Assemblies');

  SELECT COUNT(*) INTO n_roots FROM est_catalog_folders
   WHERE parent_id IS NULL AND name IN ('Custom', 'NWAC Standards', 'NW Assemblies');
  RAISE NOTICE 'section 6: %/3 root folders present (Custom, NWAC Standards, NW Assemblies)', n_roots;
END $$;


-- ─── 7. estimate_assemblies → est_catalog_items in 'NW Assemblies' ───────────────────
-- The 31 legacy assemblies become editable catalog rows (item_type Part, is_custom). estimate_assemblies
-- itself is left untouched (assembly-library.html keeps showing it read-only as 'Legacy assemblies').
-- Units are normalised to the picker's UoM spelling (ea / ft / sq ft / hrs / ls / floor / day / lb).
DO $$
DECLARE
  v_folder bigint;
  n_ins    int := 0;
BEGIN
  IF to_regclass('public.est_catalog_items') IS NULL OR to_regclass('public.est_catalog_folders') IS NULL THEN
    RAISE NOTICE 'section 7 skipped: catalog tables missing — run takeoff-v2-schema.sql, then re-run this file';
    RETURN;
  END IF;
  IF to_regclass('public.estimate_assemblies') IS NULL THEN
    RAISE NOTICE 'section 7 skipped: estimate_assemblies missing (estimating-schema.sql)';
    RETURN;
  END IF;

  SELECT id INTO v_folder FROM est_catalog_folders
   WHERE parent_id IS NULL AND name = 'NW Assemblies' ORDER BY sort_order, id LIMIT 1;
  IF v_folder IS NULL THEN
    RAISE NOTICE 'section 7 skipped: NW Assemblies root folder missing (section 6)';
    RETURN;
  END IF;

  INSERT INTO est_catalog_items
    (folder_id, folder_path, name, description, item_type, is_custom, unit,
     unit_cost, unit_labor_min, unit_labor_cost, waste_pct, is_untaxed, supplier,
     nw_category, takeoff_type, notes)
  SELECT v_folder, 'NW Assemblies', a.name, a.description, 'Part', TRUE,
         CASE lower(trim(coalesce(a.unit, '')))
           WHEN ''            THEN NULL
           WHEN 'lf'          THEN 'ft'
           WHEN 'lft'         THEN 'ft'
           WHEN 'ft'          THEN 'ft'
           WHEN 'feet'        THEN 'ft'
           WHEN 'foot'        THEN 'ft'
           WHEN 'ea'          THEN 'ea'
           WHEN 'each'        THEN 'ea'
           WHEN 'pcs'         THEN 'ea'
           WHEN 'sf'          THEN 'sq ft'
           WHEN 'sqft'        THEN 'sq ft'
           WHEN 'sq ft'       THEN 'sq ft'
           WHEN 'sq. ft'      THEN 'sq ft'
           WHEN 'square feet' THEN 'sq ft'
           WHEN 'hr'          THEN 'hrs'
           WHEN 'hrs'         THEN 'hrs'
           WHEN 'hour'        THEN 'hrs'
           WHEN 'hours'       THEN 'hrs'
           WHEN 'lump sum'    THEN 'ls'
           WHEN 'lump'        THEN 'ls'
           ELSE lower(trim(a.unit))
         END,
         coalesce(a.unit_material_cost, 0),
         coalesce(a.unit_labor_hours, 0) * 60,
         0, 0,
         (a.category = 'services'),
         a.vendor_name,
         a.category,
         CASE
           WHEN a.name ILIKE '%linear diffuser%' THEN 'linear'
           WHEN lower(trim(coalesce(a.unit, ''))) IN ('lf', 'lft', 'ft', 'feet', 'foot') THEN 'linear'
           WHEN lower(trim(coalesce(a.unit, ''))) IN ('sf', 'sqft', 'sq ft', 'sq. ft', 'square feet') THEN 'area'
           ELSE 'count'
         END,
         'Migrated from estimate_assemblies ' || a.id::text
           || CASE WHEN coalesce(a.notes, '') <> '' THEN ' · ' || a.notes ELSE '' END
    FROM estimate_assemblies a
   WHERE a.is_active
     AND NOT EXISTS (SELECT 1 FROM est_catalog_items c
                      WHERE c.folder_id = v_folder AND c.name = a.name);
  GET DIAGNOSTICS n_ins = ROW_COUNT;
  RAISE NOTICE 'section 7: % active assemblies migrated into NW Assemblies (estimate_assemblies left untouched)', n_ins;
END $$;


-- ─── 8. NWAC Standards presets (28) → est_catalog_items in 'NWAC Standards' ──────────
-- The PRESETS array that estimating.html used to hard-code (Air Outlets 5, Equipment Install 9,
-- Services 3, Rigging 5, Standalone Controls 5, Wet-tap 1). name = preset description,
-- unit_labor_min = hrs × 60, is_untaxed for services / rigging / wet-tap, cost_type_code
-- S = subcontract/service, O = other (standalone control parts), ML = material+labor install.
-- The wet-tap row's notes carry '(is_wet_tap)' so NWCatalogPicker.toLine / takeoff roll-ups flag the line.
DO $$
DECLARE
  v_std bigint;
  n_ins int := 0;
BEGIN
  IF to_regclass('public.est_catalog_items') IS NULL OR to_regclass('public.est_catalog_folders') IS NULL THEN
    RAISE NOTICE 'section 8 skipped: catalog tables missing — run takeoff-v2-schema.sql, then re-run this file';
    RETURN;
  END IF;
  SELECT id INTO v_std FROM est_catalog_folders
   WHERE parent_id IS NULL AND name = 'NWAC Standards' ORDER BY sort_order, id LIMIT 1;
  IF v_std IS NULL THEN
    RAISE NOTICE 'section 8 skipped: NWAC Standards root folder missing (section 6)';
    RETURN;
  END IF;

  INSERT INTO est_catalog_items
    (folder_id, folder_path, name, description, item_type, is_custom, unit,
     unit_cost, unit_labor_min, unit_labor_cost, waste_pct, is_untaxed, cost_type_code,
     nw_category, takeoff_type, notes)
  SELECT v_std, 'NWAC Standards', p.name, p.description, 'Part', TRUE, p.unit,
         p.unit_cost, p.unit_labor_min, 0, 0, p.is_untaxed, p.cost_type_code,
         p.nw_category, p.takeoff_type, p.notes
    FROM (VALUES
      -- ── Air Outlets Install (Air Outlets Installation Standards.md)
      ('Diffusers / grilles / registers',                                         'NWAC standard: 1.6 hr each (SM crew)',                          'ea',    0,     96,   FALSE, 'ML', 'air_outlets',       'count',  NULL),
      ('Linear diffusers',                                                        'NWAC standard: 0.8 hr per linear ft (SM crew)',                 'ft',    0,     48,   FALSE, 'ML', 'air_outlets',       'linear', NULL),
      ('VAV boxes',                                                               'NWAC standard: 2.67 hr each (SM crew)',                         'ea',    0,     160.2, FALSE, 'ML', 'air_outlets',      'count',  NULL),
      ('Fire/smoke dampers, motorized dampers',                                   'NWAC standard: 2.67 hr each (SM crew)',                         'ea',    0,     160.2, FALSE, 'ML', 'air_outlets',      'count',  NULL),
      ('Fan-powered boxes (FPBs)',                                                'NWAC standard: 8 hr each — half day (SM crew)',                 'ea',    0,     480,  FALSE, 'ML', 'air_outlets',       'count',  NULL),
      -- ── Equipment Install (weight tiers, Equipment Installation Standards.md)
      ('Equipment install (1-30 lb tier, ¼ day × 2 men)',                        'NWAC standard: 4 man-hrs (2 men × ¼ day)',                      'ea',    0,     240,  FALSE, 'ML', 'equipment_install', 'count',  NULL),
      ('Equipment install (40-90 lb tier, ½ day × 2 men)',                       'NWAC standard: 8 man-hrs (2 men × ½ day)',                      'ea',    0,     480,  FALSE, 'ML', 'equipment_install', 'count',  NULL),
      ('Equipment install (100-190 lb tier, 1 day × 2 men)',                     'NWAC standard: 16 man-hrs (2 men × 1 day)',                     'ea',    0,     960,  FALSE, 'ML', 'equipment_install', 'count',  NULL),
      ('Equipment install (200-500 lb tier, 1 day × 4 men)',                     'NWAC standard: 32 man-hrs (4 men × 1 day)',                     'ea',    0,     1920, FALSE, 'ML', 'equipment_install', 'count',  NULL),
      ('Equipment install (600+ lb tier, 1 day × 6 men)',                        'NWAC standard: 48 man-hrs (6 men × 1 day)',                     'ea',    0,     2880, FALSE, 'ML', 'equipment_install', 'count',  NULL),
      ('PTAC unit install',                                                       'NWAC standard: 2.67 hr each (6/day/2 men)',                     'ea',    0,     160.2, FALSE, 'ML', 'equipment_install','count',  NULL),
      ('Baseboard heater install',                                                'NWAC standard: 8 hr each (2/day/2 men)',                        'ea',    0,     480,  FALSE, 'ML', 'equipment_install', 'count',  NULL),
      ('Kitchen exhaust fan install',                                             'NWAC standard: 16 hr each (1/day/2 men)',                       'ea',    0,     960,  FALSE, 'ML', 'equipment_install', 'count',  NULL),
      ('Light fan install (general, non-kitchen)',                                'NWAC standard: 4 hr each (4/day/2 men)',                        'ea',    0,     240,  FALSE, 'ML', 'equipment_install', 'count',  NULL),
      -- ── Services (Shop Drawings and Testing Standards.md)
      ('Ductwork shop drawings',                                                  'NWAC standard: $2,500 per floor (no labor, untaxed)',           'floor', 2500,  0,    TRUE,  'S',  'services',          'count',  NULL),
      ('Piping shop drawings',                                                    'NWAC standard: $1,300 per floor (no labor, untaxed)',           'floor', 1300,  0,    TRUE,  'S',  'services',          'count',  NULL),
      ('Testing & balancing',                                                     'NWAC standard: $2,500 per floor (no labor, untaxed)',           'floor', 2500,  0,    TRUE,  'S',  'services',          'count',  NULL),
      -- ── Rigging (Rigging Standards.md)
      ('Indoor rigging (up to 3,000 lb)',                                         'NWAC standard: $1,000 per unit',                                'ea',    1000,  0,    TRUE,  'S',  'services',          'count',  NULL),
      ('Indoor rigging flat day (max 3 units)',                                   'NWAC standard: $3,000 per day, max 3 units',                    'day',   3000,  0,    TRUE,  'S',  'services',          'count',  NULL),
      ('Boom truck rooftop rigging (full day, up to 10th floor)',                 'NWAC standard: $6,000 per day, up to 10th floor',               'day',   6000,  0,    TRUE,  'S',  'services',          'count',  NULL),
      ('Crane rooftop rigging (no permits, 10-30 floor, max 12 units/day)',       'NWAC standard: $25,000 per day, no permits',                    'day',   25000, 0,    TRUE,  'S',  'services',          'count',  NULL),
      ('Crane rooftop rigging (with permits)',                                    'NWAC standard: $50,000 per day, with permits',                  'day',   50000, 0,    TRUE,  'S',  'services',          'count',  NULL),
      -- ── Standalone Controls (Standalone Controls Standards.md — only when no BMS)
      ('Thermostat (standalone controls)',                                        'NWAC standard: $500 each',                                      'ea',    500,   0,    FALSE, 'O',  'equipment',         'count',  NULL),
      ('Sensor (standalone controls)',                                            'NWAC standard: $400 each',                                      'ea',    400,   0,    FALSE, 'O',  'equipment',         'count',  NULL),
      ('Wiring per thermostat',                                                   'NWAC standard: $50 each',                                       'ea',    50,    0,    FALSE, 'O',  'equipment',         'count',  NULL),
      ('VAV box controls (standalone, no BMS)',                                   'NWAC standard: $1,000 per VAV',                                 'ea',    1000,  0,    FALSE, 'O',  'equipment',         'count',  NULL),
      ('Thermostat/sensor install',                                               'NWAC standard: 0.8 hr each (10/day/2 men, start-up crew)',      'ea',    0,     48,   FALSE, 'ML', 'equipment_install', 'count',  NULL),
      -- ── Piping — wet-tap standard
      ('Wet-tap connection (up to 4" pipe, one connection point / 2 pipes, e.g. CWS&R tie-in)', 'NWAC standard: $10,000 flat per connection (subcontract, untaxed)', 'ea', 10000, 0, TRUE, 'S', 'pipework', 'count', 'Wet-tap subcontract line (is_wet_tap)')
    ) AS p(name, description, unit, unit_cost, unit_labor_min, is_untaxed, cost_type_code, nw_category, takeoff_type, notes)
   WHERE NOT EXISTS (SELECT 1 FROM est_catalog_items c
                      WHERE c.folder_id = v_std AND c.name = p.name);
  GET DIAGNOSTICS n_ins = ROW_COUNT;
  RAISE NOTICE 'section 8: % of 28 NWAC Standards presets inserted (rest already present)', n_ins;
END $$;


-- ─── 9. Cost Catalog write policies (was cost-catalog-policies.sql) ──────────────────
-- takeoff-v2-schema.sql created est_catalog_folders / est_catalog_items with write policies for
-- admin, manager, lead_pm, project_manager, apm only. The Procore-style UI lets PC.MGMT_ROLES
-- (which also lists 'estimator') create, edit, move and delete catalog items and folders, so the
-- write policies include 'estimator' — otherwise Kastriot / Alikhan get "new row violates
-- row-level security policy" on every Create / Edit.
DO $$
BEGIN
  IF to_regclass('public.est_catalog_folders') IS NULL OR to_regclass('public.est_catalog_items') IS NULL THEN
    RAISE NOTICE 'section 9 skipped: est_catalog_folders / est_catalog_items missing — run takeoff-v2-schema.sql first';
    RETURN;
  END IF;

  DROP POLICY IF EXISTS "est_catalog_folders_write" ON est_catalog_folders;
  CREATE POLICY "est_catalog_folders_write" ON est_catalog_folders FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
                     AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
                     AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')));

  DROP POLICY IF EXISTS "est_catalog_items_write" ON est_catalog_items;
  CREATE POLICY "est_catalog_items_write" ON est_catalog_items FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
                     AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
                     AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')));

  RAISE NOTICE 'section 9: est_catalog_folders / est_catalog_items write policies now include estimator';
END $$;

-- Legacy assemblies stay readable for everyone (assembly-library.html shows them read-only);
-- estimators may still create fallback items there while the catalog is not imported.
DO $$
BEGIN
  IF to_regclass('public.estimate_assemblies') IS NULL THEN
    RETURN;
  END IF;
  DROP POLICY IF EXISTS "estimate_assemblies_write" ON estimate_assemblies;
  CREATE POLICY "estimate_assemblies_write" ON estimate_assemblies FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
                     AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
                     AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')));
END $$;


-- ─── 10. OPTIONAL — 'estimator' profile role (GUARDED, does nothing until enabled) ─────
-- OPEN QUESTION (a) for Russ: procore-ui.js PC.MGMT_ROLES and project-managers.html offer the role
-- 'estimator', but pm-limited-role.sql's profiles_role_check only allows
-- tech / foreman / pm / apm / lead_pm / project_manager / manager / admin / pm_limited — so an
-- 'estimator' profile cannot even be saved, and none of the estimating write policies list it.
-- If Russ confirms the role, uncomment the SET line below and re-run this file: the block then
-- extends profiles_role_check and the write policies on estimates, estimate_line_items,
-- estimate_assemblies, estimate_drawings, estimate_measurements, estimate_takeoff_layers,
-- bid_project_notes and bid_project_tasks. (project_files_write is already USING (true) WITH CHECK (true)
-- for every signed-in user, so it needs no change.) Until then Kastriot / Alikhan keep their current
-- role (apm / project_manager), which every policy already accepts.
--
-- SET nw.enable_estimator_role = 'on';
DO $$
BEGIN
  IF current_setting('nw.enable_estimator_role', true) IS DISTINCT FROM 'on' THEN
    RAISE NOTICE 'section 10 skipped: estimator role not enabled (uncomment SET nw.enable_estimator_role to apply)';
    RETURN;
  END IF;

  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('tech','foreman','pm','apm','lead_pm','project_manager','manager','admin','pm_limited','estimator'));

  IF to_regclass('public.estimates') IS NOT NULL THEN
    DROP POLICY IF EXISTS "estimates_write" ON estimates;
    CREATE POLICY "estimates_write" ON estimates FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
                       AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')))
      WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
                       AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')));
  END IF;

  IF to_regclass('public.estimate_line_items') IS NOT NULL THEN
    DROP POLICY IF EXISTS "estimate_line_items_write" ON estimate_line_items;
    CREATE POLICY "estimate_line_items_write" ON estimate_line_items FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
                       AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')))
      WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
                       AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')));
  END IF;

  IF to_regclass('public.estimate_assemblies') IS NOT NULL THEN
    DROP POLICY IF EXISTS "estimate_assemblies_write" ON estimate_assemblies;
    CREATE POLICY "estimate_assemblies_write" ON estimate_assemblies FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
                       AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')))
      WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
                       AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')));
  END IF;

  IF to_regclass('public.estimate_drawings') IS NOT NULL THEN
    DROP POLICY IF EXISTS "estimate_drawings_write" ON estimate_drawings;
    CREATE POLICY "estimate_drawings_write" ON estimate_drawings FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
                       AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')))
      WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
                       AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')));
  END IF;

  IF to_regclass('public.estimate_measurements') IS NOT NULL THEN
    DROP POLICY IF EXISTS "estimate_measurements_write" ON estimate_measurements;
    CREATE POLICY "estimate_measurements_write" ON estimate_measurements FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
                       AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')))
      WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
                       AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')));
  END IF;

  IF to_regclass('public.estimate_takeoff_layers') IS NOT NULL THEN
    DROP POLICY IF EXISTS "estimate_takeoff_layers_write" ON estimate_takeoff_layers;
    CREATE POLICY "estimate_takeoff_layers_write" ON estimate_takeoff_layers FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
                       AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')))
      WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
                       AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')));
  END IF;

  IF to_regclass('public.bid_project_notes') IS NOT NULL THEN
    DROP POLICY IF EXISTS "bid_notes_write" ON bid_project_notes;
    CREATE POLICY "bid_notes_write" ON bid_project_notes FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
                       AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')))
      WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
                       AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')));
  END IF;

  IF to_regclass('public.bid_project_tasks') IS NOT NULL THEN
    DROP POLICY IF EXISTS "bid_tasks_write" ON bid_project_tasks;
    CREATE POLICY "bid_tasks_write" ON bid_project_tasks FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
                       AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')))
      WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
                       AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')));
  END IF;

  RAISE NOTICE 'section 10: estimator role allowed in profiles_role_check and estimating / bid-board write policies';
END $$;


-- ─── 11. Verify ─────────────────────────────────────────────────────
DO $$
DECLARE
  c_settings int := 0;
  c_group int := 0; c_layer int := 0; c_catitem int := 0; c_waste int := 0; c_markup int := 0;
  c_lmarkup int := 0; c_factor int := 0; c_rate int := 0; c_tax int := 0;
  c_idx int := 0; c_fk int := 0;
  c_tag int := 0; c_lock int := 0; c_params int := 0;
  c_seq_f int := 0; c_seq_i int := 0; c_def_f int := 0; c_def_i int := 0;
  c_roots int := 0; c_asm int := 0; c_asm_src int := 0; c_std int := 0;
  c_pol_f int := 0; c_pol_i int := 0;
  n_missing int := 0;
  has_layers boolean := false;
  has_catalog boolean := false;
BEGIN
  SELECT COUNT(*) INTO c_settings FROM information_schema.columns WHERE table_name = 'estimates' AND column_name = 'settings';
  SELECT COUNT(*) INTO c_group   FROM information_schema.columns WHERE table_name = 'estimate_line_items' AND column_name = 'group_name';
  SELECT COUNT(*) INTO c_layer   FROM information_schema.columns WHERE table_name = 'estimate_line_items' AND column_name = 'layer_id';
  SELECT COUNT(*) INTO c_catitem FROM information_schema.columns WHERE table_name = 'estimate_line_items' AND column_name = 'catalog_item_id';
  SELECT COUNT(*) INTO c_waste   FROM information_schema.columns WHERE table_name = 'estimate_line_items' AND column_name = 'waste_pct';
  SELECT COUNT(*) INTO c_markup  FROM information_schema.columns WHERE table_name = 'estimate_line_items' AND column_name = 'markup_pct';
  SELECT COUNT(*) INTO c_lmarkup FROM information_schema.columns WHERE table_name = 'estimate_line_items' AND column_name = 'labor_markup_pct';
  SELECT COUNT(*) INTO c_factor  FROM information_schema.columns WHERE table_name = 'estimate_line_items' AND column_name = 'labor_factor';
  SELECT COUNT(*) INTO c_rate    FROM information_schema.columns WHERE table_name = 'estimate_line_items' AND column_name = 'labor_rate';
  SELECT COUNT(*) INTO c_tax     FROM information_schema.columns WHERE table_name = 'estimate_line_items' AND column_name = 'is_taxable';
  SELECT COUNT(*) INTO c_idx     FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_estimate_lines_group' AND indexdef LIKE '%sort_order%';
  SELECT COUNT(*) INTO c_fk      FROM information_schema.table_constraints WHERE constraint_name = 'estimate_line_items_layer_fk';

  RAISE NOTICE 'estimates.settings present:                   %', c_settings;
  RAISE NOTICE 'estimate_line_items.group_name present:       %', c_group;
  RAISE NOTICE 'estimate_line_items.layer_id present:         %', c_layer;
  RAISE NOTICE 'estimate_line_items.catalog_item_id present:  %', c_catitem;
  RAISE NOTICE 'estimate_line_items.waste_pct present:        %', c_waste;
  RAISE NOTICE 'estimate_line_items.markup_pct present:       %', c_markup;
  RAISE NOTICE 'estimate_line_items.labor_markup_pct present: %', c_lmarkup;
  RAISE NOTICE 'estimate_line_items.labor_factor present:     %', c_factor;
  RAISE NOTICE 'estimate_line_items.labor_rate present:       %', c_rate;
  RAISE NOTICE 'estimate_line_items.is_taxable present:       %', c_tax;
  RAISE NOTICE 'idx_estimate_lines_group (3-column) present:  %', c_idx;
  RAISE NOTICE 'estimate_line_items_layer_fk present:         %  (0 is expected until takeoff-v2-schema.sql has been run)', c_fk;

  SELECT COUNT(*) > 0 INTO has_layers FROM pg_class WHERE oid = to_regclass('public.estimate_takeoff_layers');
  IF has_layers THEN
    SELECT COUNT(*) INTO c_tag    FROM information_schema.columns WHERE table_name = 'estimate_takeoff_layers' AND column_name = 'tag';
    SELECT COUNT(*) INTO c_lock   FROM information_schema.columns WHERE table_name = 'estimate_takeoff_layers' AND column_name = 'is_locked';
    SELECT COUNT(*) INTO c_params FROM information_schema.columns WHERE table_name = 'estimate_takeoff_layers' AND column_name = 'params';
    RAISE NOTICE 'estimate_takeoff_layers.tag present:          %', c_tag;
    RAISE NOTICE 'estimate_takeoff_layers.is_locked present:    %', c_lock;
    RAISE NOTICE 'estimate_takeoff_layers.params present:       %', c_params;
  ELSE
    RAISE NOTICE 'estimate_takeoff_layers: table missing — sections 4 / FK skipped (run takeoff-v2-schema.sql, then re-run)';
  END IF;

  SELECT COUNT(*) = 2 INTO has_catalog FROM pg_class
   WHERE oid IN (to_regclass('public.est_catalog_folders'), to_regclass('public.est_catalog_items'));
  IF has_catalog THEN
    SELECT COUNT(*) INTO c_seq_f FROM pg_class WHERE relkind = 'S' AND relname = 'est_catalog_folders_id_seq';
    SELECT COUNT(*) INTO c_seq_i FROM pg_class WHERE relkind = 'S' AND relname = 'est_catalog_items_id_seq';
    SELECT COUNT(*) INTO c_def_f FROM information_schema.columns WHERE table_name = 'est_catalog_folders' AND column_name = 'id' AND column_default LIKE 'nextval(%';
    SELECT COUNT(*) INTO c_def_i FROM information_schema.columns WHERE table_name = 'est_catalog_items'   AND column_name = 'id' AND column_default LIKE 'nextval(%';
    SELECT COUNT(*) INTO c_roots FROM est_catalog_folders WHERE parent_id IS NULL AND name IN ('Custom', 'NWAC Standards', 'NW Assemblies');
    SELECT COUNT(*) INTO c_asm   FROM est_catalog_items i JOIN est_catalog_folders f ON f.id = i.folder_id
     WHERE f.parent_id IS NULL AND f.name = 'NW Assemblies';
    SELECT COUNT(*) INTO c_std   FROM est_catalog_items i JOIN est_catalog_folders f ON f.id = i.folder_id
     WHERE f.parent_id IS NULL AND f.name = 'NWAC Standards';
    SELECT COUNT(*) INTO c_pol_f FROM pg_policies WHERE tablename = 'est_catalog_folders' AND policyname = 'est_catalog_folders_write' AND qual LIKE '%estimator%';
    SELECT COUNT(*) INTO c_pol_i FROM pg_policies WHERE tablename = 'est_catalog_items'   AND policyname = 'est_catalog_items_write'   AND qual LIKE '%estimator%';
    IF to_regclass('public.estimate_assemblies') IS NOT NULL THEN
      SELECT COUNT(*) INTO c_asm_src FROM estimate_assemblies WHERE is_active;
    END IF;
    RAISE NOTICE 'est_catalog_folders_id_seq present:           %  (id default: %)', c_seq_f, c_def_f;
    RAISE NOTICE 'est_catalog_items_id_seq present:             %  (id default: %)', c_seq_i, c_def_i;
    RAISE NOTICE 'root folders Custom/NWAC Standards/NW Assemblies: %/3', c_roots;
    RAISE NOTICE 'NW Assemblies catalog items:                  %  (active estimate_assemblies: %)', c_asm, c_asm_src;
    RAISE NOTICE 'NWAC Standards catalog items:                 %/28', c_std;
    RAISE NOTICE 'catalog write policies include estimator:     folders=% items=%', c_pol_f, c_pol_i;
  ELSE
    RAISE NOTICE 'est_catalog_folders / est_catalog_items: tables missing — sections 5-9 skipped (run takeoff-v2-schema.sql, then re-run)';
  END IF;

  SELECT 10 - COUNT(*) INTO n_missing FROM information_schema.columns
   WHERE (table_name = 'estimates' AND column_name = 'settings')
      OR (table_name = 'estimate_line_items' AND column_name IN ('group_name', 'layer_id', 'catalog_item_id',
          'waste_pct', 'markup_pct', 'labor_markup_pct', 'labor_factor', 'labor_rate', 'is_taxable'));
  IF n_missing = 0 THEN
    RAISE NOTICE 'procore-ui-schema: all present (10/10 core columns)';
  ELSE
    RAISE NOTICE 'procore-ui-schema: % of 10 core columns missing', n_missing;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- Takeoff v2 — Procore-style takeoff layers + NWAC cost catalog
--
--   est_catalog_folders      — Procore Estimating catalog folder tree (NW Air Outlets, NW Copper Pipe, …)
--   est_catalog_items        — every catalog item (3,253 on 2026-09-27): unit cost, unit labor (minutes), waste…
--   estimate_takeoff_layers  — takeoff layers per estimate (one cost item + count/linear/area + colour/symbol)
--   estimate_measurements    — gets layer_id / deduct / drops / mark_no columns; tool_type also allows 'note' and 'measure'
--   estimate_drawings        — page_meta (sheet numbers, detected scales per page)
--
-- Run once in Supabase → SQL Editor ("Run"). Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS est_catalog_folders (
  id          BIGINT PRIMARY KEY,                 -- Procore folder id
  parent_id   BIGINT,
  name        TEXT   NOT NULL,
  path        TEXT   NOT NULL,                    -- "NW Copper Pipe - L Type / 2025-04-02 19:19:57"
  is_custom   BOOLEAN NOT NULL DEFAULT FALSE,     -- NWAC's own folders (vs Procore stock library)
  sort_order  INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS est_catalog_items (
  id                BIGINT PRIMARY KEY,           -- Procore catalog item id
  folder_id         BIGINT REFERENCES est_catalog_folders(id) ON DELETE SET NULL,
  folder_path       TEXT,
  name              TEXT NOT NULL,
  description       TEXT,
  item_type         TEXT NOT NULL DEFAULT 'Part', -- Part | Assembly | Labor | Travel | …
  is_custom         BOOLEAN NOT NULL DEFAULT FALSE,
  unit              TEXT,                         -- Ft | Ea | Hours | …
  unit_cost         NUMERIC(14,4) NOT NULL DEFAULT 0,
  unit_labor_min    NUMERIC(14,4) NOT NULL DEFAULT 0,   -- Procore "unitLabor" is minutes per unit
  unit_labor_cost   NUMERIC(14,4) NOT NULL DEFAULT 0,
  unit_labor_rate   NUMERIC(14,4),
  waste_pct         NUMERIC(8,4),
  material_waste_pct NUMERIC(8,4),
  item_margin_pct   NUMERIC(8,4),
  labor_margin_pct  NUMERIC(8,4),
  is_untaxed        BOOLEAN NOT NULL DEFAULT FALSE,
  manufacturer      TEXT,
  catalog_number    TEXT,
  supplier          TEXT,
  cost_code         TEXT,
  cost_name         TEXT,
  cost_type_code    TEXT,
  color             TEXT,
  symbol_id         TEXT,
  sub_items         JSONB,                        -- assemblies: [{itemId, quantity, …}]
  notes             TEXT,
  nw_category       TEXT CHECK (nw_category IN (
                      'disconnects','equipment','ductwork','pipework',
                      'equipment_install','air_outlets','services')),
  takeoff_type      TEXT CHECK (takeoff_type IN ('count','linear','area')),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_est_catalog_items_folder ON est_catalog_items(folder_id);
CREATE INDEX IF NOT EXISTS idx_est_catalog_items_name   ON est_catalog_items(lower(name));

CREATE TABLE IF NOT EXISTS estimate_takeoff_layers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id        UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  group_name         TEXT NOT NULL DEFAULT 'Default Group',
  name               TEXT NOT NULL,
  takeoff_type       TEXT NOT NULL CHECK (takeoff_type IN ('count','linear','area')),
  category           TEXT NOT NULL DEFAULT 'ductwork' CHECK (category IN (
                       'disconnects','equipment','ductwork','pipework',
                       'equipment_install','air_outlets','services')),
  catalog_item_id    BIGINT,                      -- est_catalog_items.id when picked from the catalog
  unit               TEXT,                        -- ea | ft | sqft
  unit_material_cost NUMERIC(14,4) NOT NULL DEFAULT 0,
  unit_labor_hours   NUMERIC(14,4) NOT NULL DEFAULT 0,
  labor_crew_type    TEXT NOT NULL DEFAULT 'sm' CHECK (labor_crew_type IN ('sm','pipe','startup','other','none')),
  color              TEXT NOT NULL DEFAULT '#0696D7',
  symbol             TEXT NOT NULL DEFAULT 'circle',   -- circle | square | diamond | triangle | x
  line_width         NUMERIC(6,2) NOT NULL DEFAULT 3,
  multiplier         NUMERIC(10,4) NOT NULL DEFAULT 1, -- count: each mark = N; linear: pipes per run
  drop_length_ft     NUMERIC(10,4) NOT NULL DEFAULT 0, -- linear: vertical drop added per drop point
  rise               NUMERIC(10,4) NOT NULL DEFAULT 0, -- linear: slope rise:run (0 = flat)
  run                NUMERIC(10,4) NOT NULL DEFAULT 12,
  waste_pct          NUMERIC(8,4)  NOT NULL DEFAULT 0, -- material only
  labor_factor       NUMERIC(8,4)  NOT NULL DEFAULT 1,
  extra_count        NUMERIC(12,4) NOT NULL DEFAULT 0, -- quantity added by hand (not on a drawing)
  is_visible         BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order         INTEGER NOT NULL DEFAULT 0,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_estimate_takeoff_layers_est ON estimate_takeoff_layers(estimate_id, sort_order);

ALTER TABLE estimate_measurements ADD COLUMN IF NOT EXISTS layer_id UUID REFERENCES estimate_takeoff_layers(id) ON DELETE CASCADE;
ALTER TABLE estimate_measurements ADD COLUMN IF NOT EXISTS deduct  BOOLEAN NOT NULL DEFAULT FALSE;   -- negative measurement
ALTER TABLE estimate_measurements ADD COLUMN IF NOT EXISTS drops   INTEGER NOT NULL DEFAULT 0;       -- vertical drops on this run
ALTER TABLE estimate_measurements ADD COLUMN IF NOT EXISTS mark_no INTEGER;                          -- auto-incrementing label
ALTER TABLE estimate_measurements DROP CONSTRAINT IF EXISTS estimate_measurements_tool_type_check;
ALTER TABLE estimate_measurements ADD CONSTRAINT estimate_measurements_tool_type_check
  CHECK (tool_type IN ('scale','length','area','count','note','measure'));
CREATE INDEX IF NOT EXISTS idx_estimate_measurements_layer ON estimate_measurements(layer_id);

ALTER TABLE estimate_drawings ADD COLUMN IF NOT EXISTS page_meta JSONB;   -- {"1":{"sheet":"M-201","scale":"1/8\" = 1'"}, …}

-- touch triggers
DROP TRIGGER IF EXISTS trg_estimate_takeoff_layers_touch ON estimate_takeoff_layers;
CREATE TRIGGER trg_estimate_takeoff_layers_touch BEFORE UPDATE ON estimate_takeoff_layers
  FOR EACH ROW EXECUTE FUNCTION fn_estimating_touch();

-- RLS: everyone signed in reads; management writes
ALTER TABLE est_catalog_folders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE est_catalog_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_takeoff_layers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "est_catalog_folders_read" ON est_catalog_folders;
CREATE POLICY "est_catalog_folders_read" ON est_catalog_folders FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "est_catalog_folders_write" ON est_catalog_folders;
CREATE POLICY "est_catalog_folders_write" ON est_catalog_folders FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm')));

DROP POLICY IF EXISTS "est_catalog_items_read" ON est_catalog_items;
CREATE POLICY "est_catalog_items_read" ON est_catalog_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "est_catalog_items_write" ON est_catalog_items;
CREATE POLICY "est_catalog_items_write" ON est_catalog_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm')));

DROP POLICY IF EXISTS "estimate_takeoff_layers_read" ON estimate_takeoff_layers;
CREATE POLICY "estimate_takeoff_layers_read" ON estimate_takeoff_layers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "estimate_takeoff_layers_write" ON estimate_takeoff_layers;
CREATE POLICY "estimate_takeoff_layers_write" ON estimate_takeoff_layers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm')));

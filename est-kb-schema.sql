-- Estimating knowledge library (2026-10-18): manuals / standards / company rules the estimators can ask about.
-- est_kb_docs = one row per document (uploaded PDF or typed note); est_kb_chunks = page-sized text pieces with full-text search.
-- The chat Edge Function (est-kb-chat) runs est_kb_search() and answers with Claude, citing document + page.
-- Copyright note: MCAA / SMACNA / ACCA manuals are licensed publications — upload only copies NWAC owns, for internal use.
CREATE TABLE IF NOT EXISTS est_kb_docs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  org         TEXT,                      -- MCAA | SMACNA | ACCA | NYC code | NWAC | supplier | other
  kind        TEXT NOT NULL DEFAULT 'pdf' CHECK (kind IN ('pdf','note','link')),
  file_path   TEXT,                      -- storage bucket est-kb/<doc id>.pdf
  url         TEXT,
  pages       INTEGER,
  chunks      INTEGER NOT NULL DEFAULT 0,
  notes       TEXT,
  uploaded_by UUID DEFAULT auth.uid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS est_kb_chunks (
  id        BIGSERIAL PRIMARY KEY,
  doc_id    UUID NOT NULL REFERENCES est_kb_docs(id) ON DELETE CASCADE,
  page      INTEGER,
  chunk_no  INTEGER NOT NULL,
  section   TEXT,
  content   TEXT NOT NULL,
  tsv       TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', coalesce(section, '') || ' ' || content)) STORED
);
CREATE INDEX IF NOT EXISTS idx_est_kb_chunks_tsv ON est_kb_chunks USING GIN (tsv);
CREATE INDEX IF NOT EXISTS idx_est_kb_chunks_doc ON est_kb_chunks(doc_id, page);

ALTER TABLE est_kb_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE est_kb_chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "est_kb_docs_read" ON est_kb_docs;
CREATE POLICY "est_kb_docs_read" ON est_kb_docs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "est_kb_docs_write" ON est_kb_docs;
CREATE POLICY "est_kb_docs_write" ON est_kb_docs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')));
DROP POLICY IF EXISTS "est_kb_chunks_read" ON est_kb_chunks;
CREATE POLICY "est_kb_chunks_read" ON est_kb_chunks FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "est_kb_chunks_write" ON est_kb_chunks;
CREATE POLICY "est_kb_chunks_write" ON est_kb_chunks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','manager','lead_pm','project_manager','apm','estimator')));

-- ranked full-text search used by the chat function and the page (websearch syntax: quotes, OR, -word)
CREATE OR REPLACE FUNCTION est_kb_search(q TEXT, lim INTEGER DEFAULT 12)
RETURNS TABLE (chunk_id BIGINT, doc_id UUID, title TEXT, org TEXT, page INTEGER, section TEXT, content TEXT, rank REAL)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT c.id, c.doc_id, d.title, d.org, c.page, c.section, c.content,
         ts_rank_cd(c.tsv, websearch_to_tsquery('english', q)) AS rank
  FROM est_kb_chunks c JOIN est_kb_docs d ON d.id = c.doc_id
  WHERE c.tsv @@ websearch_to_tsquery('english', q)
  ORDER BY rank DESC, c.doc_id, c.page
  LIMIT lim;
$$;

-- questions and answers kept for review (what estimators ask, what the bot said, which chunks it used)
CREATE TABLE IF NOT EXISTS est_kb_chat_log (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID DEFAULT auth.uid(),
  question   TEXT NOT NULL,
  answer     TEXT,
  sources    JSONB,
  model      TEXT,
  tokens_in  INTEGER, tokens_out INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE est_kb_chat_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "est_kb_chat_log_rw" ON est_kb_chat_log;
CREATE POLICY "est_kb_chat_log_rw" ON est_kb_chat_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public) VALUES ('est-kb', 'est-kb', false) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "est_kb_bucket_rw" ON storage.objects;
CREATE POLICY "est_kb_bucket_rw" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'est-kb') WITH CHECK (bucket_id = 'est-kb');

SELECT 'est kb ready' AS result;

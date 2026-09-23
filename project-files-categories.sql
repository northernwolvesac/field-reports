-- Project folder document categories (Drawings / Submittals / Manuals /
-- Warranties / Reports / Other) now stored in project_files.
ALTER TABLE project_files DROP CONSTRAINT IF EXISTS project_files_category_check;
ALTER TABLE project_files ADD CONSTRAINT project_files_category_check CHECK (category IN (
  'drawings','quotes','rfi','specs','permits','submittals','leveling_sheet','close_out',
  'photos','contracts','manuals','warranties','reports','other'));
SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'project_files_category_check';

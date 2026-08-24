-- Conversion job pointer (corpora-web#74): the explorer reads
-- GET /convert/{job_id}/index|content|nodes|versions after reload.
-- Nullable so direct .corpus uploads and legacy rows stay valid; a missing
-- or expired job id is an empty explorer, not an error.

alter table public.corpus_documents
  add column if not exists job_id text;

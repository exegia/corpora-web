-- Real conversion metadata (004-connect-with-py): the archive's manifest
-- description and toc.yml section rows, captured client-side at conversion
-- time (the backend cannot serve detail data for unpublished job results —
-- see specs/004-connect-with-py/research.md R2). Additive and nullable per
-- constitution Principle IV; legacy rows render an explicit empty state.

alter table public.corpus_documents
  add column if not exists description text,
  add column if not exists toc         jsonb;

-- Detach the project corpus into standalone corpus documents (003 follow-up):
-- the Corpus route now owns uploads; projects import a document from there.
--   * corpus_documents: the uploaded .corpus file or Hugging Face URL
--   * corpus_commits rehomes from project_id to document_id
--   * projects.corpus_* columns collapse into corpus_document_id
-- Anon policies follow the temporary pre-auth posture (see 20260720071456).

create table if not exists public.corpus_documents (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  source      text        not null check (source in ('upload','huggingface')),
  path        text        not null,
  filename    text,
  uploaded_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

alter table public.corpus_documents enable row level security;

create policy "anon read corpus documents"   on public.corpus_documents for select using (true);
create policy "anon insert corpus documents" on public.corpus_documents for insert with check (true);
create policy "anon delete corpus documents" on public.corpus_documents for delete using (true);

alter table public.projects
  add column if not exists corpus_document_id uuid
    references public.corpus_documents (id) on delete set null;

-- Move each project's embedded corpus into a document and link it back.
with moved as (
  insert into public.corpus_documents (name, source, path, filename, uploaded_at)
  select coalesce(corpus_filename, corpus_path), corpus_source, corpus_path,
         corpus_filename, coalesce(corpus_uploaded_at, now())
  from public.projects
  where corpus_source is not null and corpus_path is not null
  returning id, path
)
update public.projects p
  set corpus_document_id = moved.id
  from moved
  where p.corpus_path = moved.path;

-- Rehome the version history on the document.
alter table public.corpus_commits
  add column if not exists document_id uuid
    references public.corpus_documents (id) on delete cascade;

update public.corpus_commits c
  set document_id = p.corpus_document_id
  from public.projects p
  where c.project_id = p.id;

delete from public.corpus_commits where document_id is null;

alter table public.corpus_commits alter column document_id set not null;
alter table public.corpus_commits drop column if exists project_id;
alter table public.corpus_commits
  add constraint corpus_commits_document_sha_key unique (document_id, sha);

create index if not exists idx_corpus_commits_document
  on public.corpus_commits (document_id, committed_at desc);

alter table public.projects
  drop column if exists corpus_source,
  drop column if exists corpus_path,
  drop column if exists corpus_filename,
  drop column if exists corpus_uploaded_at;

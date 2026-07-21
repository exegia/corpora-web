-- Project publishing workflow (003):
--   * status vocabulary: progress -> ready-for-review, completed -> published
--   * the project's own corpus (uploaded .corpus file or Hugging Face URL)
--   * corpus_commits: version history extracted from the corpus' nested .git
--   * private storage bucket for uploaded .corpus files
-- The app still runs pre-auth on the anon key, so all new policies follow the
-- temporary anon posture (see 20260720071456) until corpora-auth lands.

-- ---- Status vocabulary ----------------------------------------------------

alter table public.projects drop constraint if exists projects_status_check;

update public.projects set status = 'ready-for-review' where status = 'progress';
update public.projects set status = 'published'        where status = 'completed';

alter table public.projects
  add constraint projects_status_check
  check (status in ('draft','started','ready-for-review','published','failed'));

-- ---- Project corpus (uploaded file or Hugging Face URL) -------------------

alter table public.projects
  add column if not exists corpus_source      text
    check (corpus_source in ('upload','huggingface')),
  add column if not exists corpus_path        text,
  add column if not exists corpus_filename    text,
  add column if not exists corpus_uploaded_at timestamptz;

-- ---- Corpus version history (extracted from the nested .git) --------------

create table if not exists public.corpus_commits (
  id           uuid        primary key default gen_random_uuid(),
  project_id   uuid        not null references public.projects (id) on delete cascade,
  sha          text        not null,
  message      text        not null,
  author_name  text,
  author_email text,
  branch       text,
  committed_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (project_id, sha)
);

create index if not exists idx_corpus_commits_project
  on public.corpus_commits (project_id, committed_at desc);

alter table public.corpus_commits enable row level security;

create policy "anon read corpus commits"   on public.corpus_commits for select using (true);
create policy "anon insert corpus commits" on public.corpus_commits for insert with check (true);
create policy "anon delete corpus commits" on public.corpus_commits for delete using (true);

-- ---- Storage bucket for .corpus uploads -----------------------------------

insert into storage.buckets (id, name, public)
values ('project-corpora', 'project-corpora', false)
on conflict (id) do nothing;

create policy "anon read project corpora"
  on storage.objects for select
  using (bucket_id = 'project-corpora');

create policy "anon upload project corpora"
  on storage.objects for insert
  with check (bucket_id = 'project-corpora');

create policy "anon update project corpora"
  on storage.objects for update
  using (bucket_id = 'project-corpora')
  with check (bucket_id = 'project-corpora');

create policy "anon delete project corpora"
  on storage.objects for delete
  using (bucket_id = 'project-corpora');

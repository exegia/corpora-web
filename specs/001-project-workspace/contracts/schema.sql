-- Contract: Postgres schema for Project Workspace (001-project-workspace)
-- Apply as the initial Supabase migration (supabase/migrations/<ts>_project_workspace.sql)

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  description text,
  owner_id    uuid, -- stays null until corpora-auth ships (FR-011)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index projects_updated_at_idx on public.projects (updated_at desc);
create index projects_owner_id_idx on public.projects (owner_id);

-- ---------------------------------------------------------------------------
-- corpora (metadata only; files live in the Hugging Face bucket at hf_path)
-- Owned by the Library feature; created here because links reference it.
-- ---------------------------------------------------------------------------
create table public.corpora (
  id            uuid primary key default gen_random_uuid(),
  uid           text not null unique, -- ICorpusManifest.uid
  name          text not null,
  description   text,
  version       text not null default '0.0.0',
  language      text,
  language_code text,
  type          text,     -- CorpusEnum value; enum ownership deferred to Library
  category      text,     -- CategoryEnum value
  hf_path       text,     -- Hugging Face bucket object path/URL
  available     boolean not null default true, -- false => stale (FR-008)
  owner_id      uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index corpora_owner_id_idx on public.corpora (owner_id);

-- ---------------------------------------------------------------------------
-- project_corpora (Corpus Link; workspace association, not manifest provenance)
-- ---------------------------------------------------------------------------
create table public.project_corpora (
  project_id uuid not null references public.projects (id) on delete cascade,
  corpus_id  uuid not null references public.corpora (id) on delete cascade,
  linked_at  timestamptz not null default now(),
  primary key (project_id, corpus_id) -- FR-007: link at most once
);

create index project_corpora_corpus_id_idx on public.project_corpora (corpus_id);

-- ---------------------------------------------------------------------------
-- project_references
-- ---------------------------------------------------------------------------
create table public.project_references (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  title       text not null check (length(trim(title)) > 0),
  authors     text,
  year        smallint,
  publication text,
  url         text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index project_references_project_id_idx on public.project_references (project_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();
create trigger corpora_touch before update on public.corpora
  for each row execute function public.touch_updated_at();
create trigger project_references_touch before update on public.project_references
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: enabled, with TEMPORARY permissive anon policies (clarified v1 posture:
-- one shared pool). The corpora-auth cutover replaces these policies with
-- owner_id = auth.uid() rules; no schema change required.
-- ---------------------------------------------------------------------------
alter table public.projects enable row level security;
alter table public.corpora enable row level security;
alter table public.project_corpora enable row level security;
alter table public.project_references enable row level security;

create policy "anon full access (temporary)" on public.projects
  for all to anon using (true) with check (true);
create policy "anon full access (temporary)" on public.corpora
  for all to anon using (true) with check (true);
create policy "anon full access (temporary)" on public.project_corpora
  for all to anon using (true) with check (true);
create policy "anon full access (temporary)" on public.project_references
  for all to anon using (true) with check (true);

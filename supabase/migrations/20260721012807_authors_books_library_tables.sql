-- authors / books: Library-feature tables created directly on the remote
-- (outside migration history) during the 2026-07-20 rebuild; pulled into the
-- checked-in migrations so a fresh `supabase db reset` reproduces them.
-- Guarded throughout: on the remote, where the objects already exist, this
-- replays as a no-op.

create table if not exists public.authors (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  first_name    text,
  last_name     text,
  period        text,
  date_of_birth text,
  date_of_death text,
  origin        text,
  biography     text,
  image_url     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz
);

create table if not exists public.books (
  id          text primary key,
  title       text,
  description text,
  type        text,
  language    text,
  period      text,
  category    text not null default '[]',
  licence     text,
  credits     text,
  corpus_id   uuid references public.corpora (id) on delete cascade
);

-- corpora gains an optional author link
alter table public.corpora add column if not exists author_id uuid;
do $$ begin
  alter table public.corpora
    add constraint corpora_author_id_fkey
      foreign key (author_id) references public.authors (id) on delete set null;
exception when duplicate_object then null; end $$;

alter table public.authors enable row level security;
alter table public.books   enable row level security;

create or replace trigger authors_set_updated_at
  before update on public.authors
  for each row execute function public.set_updated_at();

-- authors: read-only to the app; books ships RLS-on with no policies yet
-- (not app-reachable until the Library feature lands)
drop policy if exists "authors_select_public" on public.authors;
create policy "authors_select_public" on public.authors for select using (true);

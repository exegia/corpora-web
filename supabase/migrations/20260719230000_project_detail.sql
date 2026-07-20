-- 002-project-detail — additive migration on the 001 schema.
-- Apply as supabase/migrations/<timestamp>_project_detail.sql
-- Ref: specs/002-project-detail/data-model.md

-- ---------------------------------------------------------------------------
-- organizations (created before users: users.organization_id references it)
-- ---------------------------------------------------------------------------
create table public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) > 0),
  website    text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- user_directory (seeded creator directory; read-only until corpora-auth ships).
-- NOTE: public.users already exists on the remote as corpora-auth's profile
-- table (FK to auth.users + signup trigger), so the dummy directory lives in
-- its own table; at cutover projects.user_id re-points to public.users via
-- user_directory.auth_id mapping (research R4, updated during T001).
-- ---------------------------------------------------------------------------
create table public.user_directory (
  id               uuid primary key,
  name             text,
  username         text not null unique check (length(trim(username)) > 0),
  email            text not null unique,
  phone            text,
  website          text,
  system_path      text,
  operating_system text,
  address_street   text,
  address_suite    text,
  address_city     text,
  address_zipcode  text,
  address_country  text,
  organization_id  uuid references public.organizations (id) on delete set null,
  auth_id          uuid unique, -- reserved: Supabase auth principal claim (research R4)
  created_at       timestamptz not null default now()
);

-- Dummy user seed (fixed UUIDs; replaced by real users when corpora-auth ships).
-- 00000000-0000-4000-8000-000000000001 is the designated default user (FR-017 backfill).
insert into public.user_directory (id, name, username, email) values
  ('00000000-0000-4000-8000-000000000001', 'Default User',   'default',  'default@corpora.local'),
  ('00000000-0000-4000-8000-000000000002', 'Ada Researcher', 'ada',      'ada@corpora.local'),
  ('00000000-0000-4000-8000-000000000003', 'Ben Scholar',    'ben',      'ben@corpora.local'),
  ('00000000-0000-4000-8000-000000000004', 'Cai Linguist',   'cai',      'cai@corpora.local'),
  ('00000000-0000-4000-8000-000000000005', 'Dina Historian', 'dina',     'dina@corpora.local'),
  ('00000000-0000-4000-8000-000000000006', 'Eli Archivist',  'eli',      'eli@corpora.local')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- licenses (catalog; ships EMPTY — seeded later via the user's SQL seed)
-- ---------------------------------------------------------------------------
create table public.licenses (
  id              text primary key, -- natural key, e.g. 'CC-BY-4.0'
  title           text not null,
  url             text,
  domain_content  boolean not null default false,
  domain_data     boolean not null default false,
  domain_software boolean not null default false,
  family          text,
  maintainer      text,
  is_generic      boolean,
  license_text    text,
  status          text not null check (status in ('active','retired','superseded'))
);

-- ---------------------------------------------------------------------------
-- project_licenses (attachment with per-license agreement, FR-010/FR-012)
-- ---------------------------------------------------------------------------
create table public.project_licenses (
  project_id        uuid not null references public.projects (id) on delete cascade,
  license_id        text not null references public.licenses (id) on delete restrict,
  agreed_at         timestamptz not null default now(),
  agreed_by_user_id uuid not null references public.user_directory (id) on delete restrict,
  primary key (project_id, license_id) -- no duplicate attachment (FR-010)
);

create index project_licenses_license_id_idx on public.project_licenses (license_id);

-- ---------------------------------------------------------------------------
-- projects — additive detail columns (001 columns untouched; owner_id stays
-- reserved for the auth principal)
-- ---------------------------------------------------------------------------
alter table public.projects
  add column status          text not null default 'draft'
    check (status in ('draft','started','progress','completed','failed')),
  add column type            text
    check (type in ('bible','commentary','lexicon','biography','review',
                    'manuscript','tanakh','quran','apocrypha','regular')),
  add column language        text
    check (language in ('hebrew','greek','syriac','arabic','aramaic','protoCuneiform',
                        'akkadian','ugaritic','pali','latin','dutch','french','italian','english')),
  add column category        text
    check (category in ('biblical','religious','literary','historical','paratext')),
  add column organization_id uuid references public.organizations (id) on delete set null,
  add column user_id         uuid references public.user_directory (id) on delete restrict;

-- Conditional classification integrity (FR-006..FR-009, SC-003; research R2)
alter table public.projects add constraint projects_classification_check check (
  (type in ('bible','tanakh','quran','apocrypha') and language is not null and category is null)
  or (type in ('biography','commentary','review') and category is not null and language is null)
  or ((type is null or type in ('lexicon','manuscript','regular'))
      and language is null and category is null)
);

-- Backfill pre-002 projects to the seeded default user, then require a creator
-- (FR-015/FR-017)
update public.projects
  set user_id = '00000000-0000-4000-8000-000000000001'
  where user_id is null;
alter table public.projects alter column user_id set not null;

create index projects_organization_id_idx on public.projects (organization_id);
create index projects_user_id_idx on public.projects (user_id);

-- ---------------------------------------------------------------------------
-- RLS — enabled from creation; permissive anon policies scoped to what the
-- app actually does (pre-auth posture, Constitution IV)
-- ---------------------------------------------------------------------------
alter table public.user_directory            enable row level security;
alter table public.organizations    enable row level security;
alter table public.licenses         enable row level security;
alter table public.project_licenses enable row level security;

-- users: directory is read-only to the app
create policy "anon read user_directory" on public.user_directory            for select using (true);
-- licenses: catalog is read-only to the app
create policy "anon read licenses"     on public.licenses         for select using (true);
-- organizations: pick-or-create + edit; no delete from the app in v1
create policy "anon read orgs"         on public.organizations    for select using (true);
create policy "anon insert orgs"       on public.organizations    for insert with check (true);
create policy "anon update orgs"       on public.organizations    for update using (true);
-- project_licenses: attach/detach
create policy "anon read plicenses"    on public.project_licenses for select using (true);
create policy "anon insert plicenses"  on public.project_licenses for insert with check (true);
create policy "anon delete plicenses"  on public.project_licenses for delete using (true);

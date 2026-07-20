-- 002-project-detail — additive migration on the 001 schema.
-- Apply as supabase/migrations/<timestamp>_project_detail.sql
-- Ref: specs/002-project-detail/data-model.md
--
-- Rewritten 2026-07-20 to match the linked Supabase project after its licence
-- rebuild: the catalogue tables use British spellings (`licences`,
-- `project_licences`), the catalogue gained enum types plus conformance and
-- legacy-id metadata, and the attachment table gained a surrogate uuid PK with
-- a paired agreement check. The version matches the remote migration-history
-- entry `20260720032545_project_detail`; the two follow-up hotfixes applied on
-- the remote are checked in as the next two migrations.

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
-- updated_at helper for tables that use the `updated_at` convention without
-- the 001 `touch_updated_at` trigger (licences below)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- licences (catalogue; ships EMPTY — seeded out of band from
-- https://licenses.opendefinition.org/licenses/groups/all.json, FR-011)
-- ---------------------------------------------------------------------------
create type public.licence_status as enum ('active', 'retired', 'superseded');
create type public.licence_conformance as enum ('not reviewed', 'approved', 'rejected');

create table public.licences (
  id              text primary key, -- natural key, e.g. 'CC-BY-4.0'
  title           text not null,
  url             text,
  maintainer      text,
  family          text,
  status          public.licence_status not null default 'active',
  domain_content  boolean not null default false,
  domain_data     boolean not null default false,
  domain_software boolean not null default false,
  od_conformance  public.licence_conformance,
  osd_conformance public.licence_conformance,
  is_generic      boolean not null default false,
  legacy_ids      text[],
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

comment on table public.licences is
  'Open licence catalogue sourced from https://licenses.opendefinition.org/licenses/groups/all.json';

create index idx_licences_status          on public.licences (status);
create index idx_licences_domain_content  on public.licences (domain_content) where domain_content;
create index idx_licences_domain_data     on public.licences (domain_data) where domain_data;
create index idx_licences_domain_software on public.licences (domain_software) where domain_software;

create trigger licences_set_updated_at
  before update on public.licences
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- project_licences (attachment with per-licence agreement, FR-010/FR-012).
-- Surrogate uuid PK; (project_id, licence_id) unique blocks duplicate
-- attachment (FR-010). Agreement metadata is nullable but paired: either both
-- agreed_at and agreed_by_user_id are set or neither is.
-- ---------------------------------------------------------------------------
create table public.project_licences (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects (id) on delete cascade,
  licence_id        text not null references public.licences (id) on delete restrict,
  agreed_by_user_id uuid references public.user_directory (id) on delete restrict,
  agreed_at         timestamptz,
  created_at        timestamptz not null default now(),
  constraint project_licences_project_id_licence_id_key
    unique (project_id, licence_id),
  constraint project_licences_agreement_pair check (
    (agreed_at is null and agreed_by_user_id is null)
    or (agreed_at is not null and agreed_by_user_id is not null)
  )
);

comment on table public.project_licences is
  'Many-to-many join between projects and licences, plus per-project licence agreement metadata.';
comment on column public.project_licences.agreed_at is
  'Timestamp at which the project owner agreed to the licence terms.';
comment on column public.project_licences.agreed_by_user_id is
  'User who agreed to the licence terms for this project. Set together with agreed_at.';

create index project_licences_project_id_idx        on public.project_licences (project_id);
create index project_licences_licence_id_idx        on public.project_licences (licence_id);
create index project_licences_agreed_by_user_id_idx on public.project_licences (agreed_by_user_id);

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
alter table public.user_directory   enable row level security;
alter table public.organizations    enable row level security;
alter table public.licences         enable row level security;
alter table public.project_licences enable row level security;

-- user_directory: directory is read-only to the app
create policy "anon read user_directory" on public.user_directory for select using (true);

-- licences: catalogue is world-readable; writes reserved for authenticated
-- (the catalogue is maintained out of band, FR-011)
create policy "licences_select_public"        on public.licences for select using (true);
create policy "licences_insert_authenticated" on public.licences for insert to authenticated with check (true);
create policy "licences_update_authenticated" on public.licences for update to authenticated using (true) with check (true);

-- organizations: pick-or-create + edit; no delete from the app in v1. The
-- *_authenticated policies mirror the remote's post-auth posture; they are
-- redundant while the anon policies exist but keep a fresh reset in sync
-- with the linked project.
create policy "anon read orgs"   on public.organizations for select using (true);
create policy "anon insert orgs" on public.organizations for insert with check (true);
create policy "anon update orgs" on public.organizations for update using (true);
create policy "organizations_select_authenticated" on public.organizations
  for select using (auth.role() = 'authenticated');
create policy "organizations_insert_authenticated" on public.organizations
  for insert with check (auth.role() = 'authenticated');
create policy "organizations_update_authenticated" on public.organizations
  for update using (auth.role() = 'authenticated');

-- project_licences: RLS is on but no policies yet. The remote rebuild shipped
-- owner-based (auth.uid()) policies here; 20260720071456 replaces them with
-- the temporary anon attach/detach posture the app needs pre-auth.

-- Shared JobStore for corpora-py /convert and /ingest (py issues #140/#177).
-- Mirrors the tracked source of truth in
-- corpora-py/packages/admin/sql/conversion_jobs.sql; keep the two in sync.
-- corpora-py reads and writes this table with the service-role key via
-- PostgREST. RLS is enabled with no policies so anon/authenticated JWTs
-- cannot read other users' jobs; the service role bypasses RLS and
-- JobManager enforces ownership in application code.
--
-- Already live on the remote project (table since py#141; the `validation`
-- column applied manually on 2026-08-25 after its absence made every
-- enqueue fail with 503 "Job store unavailable"). Everything below is
-- idempotent so fresh local stacks and the drifted remote converge.

create table if not exists public.conversion_jobs (
  id text primary key,
  source_format text not null,
  name text not null,
  status text not null,
  created_at double precision not null,
  started_at double precision,
  finished_at double precision,
  result_key text,
  error text,
  logs jsonb not null default '[]'::jsonb,
  owner text,
  display_name text,
  -- Post-conversion validation summary (py issue #177); null until validated.
  validation jsonb
);

-- Existing deployments created before py#177: add the column.
alter table public.conversion_jobs add column if not exists validation jsonb;

create index if not exists conversion_jobs_owner_created_at_idx
  on public.conversion_jobs (owner, created_at desc);

create index if not exists conversion_jobs_finished_at_idx
  on public.conversion_jobs (finished_at);

alter table public.conversion_jobs enable row level security;

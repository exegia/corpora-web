-- Let a signed-in user reach the workspace tables.
--
-- Four tables from 001 carry a single policy scoped `to anon`:
--
--   create policy "anon full access (temporary)" on public.projects
--     for all to anon using (true) with check (true);
--
-- A Postgres policy only applies to the roles it names. Before auth, every
-- request arrived as `anon`, so that was the whole story. The moment a user
-- signs in, supabase-js sends their JWT and PostgREST switches the role to
-- `authenticated` — which none of these policies name. RLS then denies, and
-- **denial returns zero rows, not an error**: every list page would come back
-- empty, no request would fail, and no test would catch it.
--
-- Verified against the live project (ivaecofevxactmmupvyp), not the migration
-- history, which has drifted. These four are the only `{anon}`-scoped policies;
-- every other policy in `public` is role-less, i.e. `TO public`, which already
-- covers both roles.
--
-- Deliberately a *parallel* policy per table rather than widening the existing
-- one to `public`. The originals are named "(temporary)" and are meant to be
-- dropped once real ownership rules land; folding `authenticated` into them
-- would quietly make a blanket permissive policy permanent and extend it to a
-- role it was never reviewed for. Two policies keep the intent legible: one
-- obviously provisional, one deliberate.
--
-- These grant blanket access, matching today's anon behaviour exactly. They are
-- a lateral move, not a security model — narrowing both sets to real ownership
-- checks is separate work.

create policy "authenticated full access (temporary)" on public.projects
  for all to authenticated using (true) with check (true);

create policy "authenticated full access (temporary)" on public.corpora
  for all to authenticated using (true) with check (true);

create policy "authenticated full access (temporary)" on public.project_corpora
  for all to authenticated using (true) with check (true);

create policy "authenticated full access (temporary)" on public.project_references
  for all to authenticated using (true) with check (true);

-- Not addressed here: `public.books` has RLS enabled and **zero** policies, so
-- it is unreadable by every role including anon. That is broken today, not a
-- regression introduced by auth, and picking the right policy for it is a
-- product decision rather than part of wiring sign-in.

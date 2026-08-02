-- books: give the table the public read policy its sibling `authors` already has.
--
-- 20260721012807 created `books` with RLS enabled and no policies, deliberately
-- ("not app-reachable until the Library feature lands"). RLS-on-with-no-policies
-- denies every role, so the table is currently unreadable by `anon` and
-- `authenticated` alike. The table is public catalogue data — the same shape as
-- `authors` — so it gets the same role-less select policy rather than staying
-- dark until someone rediscovers why their query returns zero rows.
--
-- Read only, on purpose: nothing in the app writes `books` (`app/routes/library.tsx`
-- is still a stub and no `app/lib/` module touches the table). When the Library
-- feature does need writes, add them scoped `to authenticated`, following
-- `licences_insert_authenticated` / `licences_update_authenticated` in
-- 20260720032545 — not the temporary `anon`-write posture used by the workspace
-- tables.
--
-- Role-less (`using (true)` with no `TO` clause) so it covers `anon` and
-- `authenticated` both, which matters now that sign-in flips the Postgres role.
--
-- Guarded so this replays as a no-op.

drop policy if exists "books_select_public" on public.books;
create policy "books_select_public" on public.books for select using (true);

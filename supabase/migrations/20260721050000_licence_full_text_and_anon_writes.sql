-- Licence text storage: the detail route downloads the licence text on first
-- visit and stores it here; the superadmin can edit it with the markdown
-- editor.
alter table public.licences add column if not exists full_text text;

-- The app runs pre-auth on the anon key; the existing insert/update policies
-- only cover `authenticated`, silently blocking catalog edits. Temporary anon
-- posture until corpora-auth lands (superadmin gating happens in the app).
drop policy if exists "anon insert licences" on public.licences;
drop policy if exists "anon update licences" on public.licences;
create policy "anon insert licences" on public.licences for insert with check (true);
create policy "anon update licences" on public.licences for update using (true) with check (true);

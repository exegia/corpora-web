-- The app runs pre-auth on the anon key (see projects "anon full access
-- (temporary)"); the owner-based policies from the remote licence rebuild
-- silently blocked every attach/detach because auth.uid() is null. Replace
-- them with the temporary anon posture until corpora-auth lands.
--
-- Replayed from the remote history (20260720071456). The drops are guarded
-- because the checked-in 002 migration never creates the owner-based
-- policies — on a fresh `supabase db reset` only the creates below apply.
drop policy if exists "project_licences_select_own" on public.project_licences;
drop policy if exists "project_licences_insert_own" on public.project_licences;
drop policy if exists "project_licences_update_own" on public.project_licences;
drop policy if exists "project_licences_delete_own" on public.project_licences;

create policy "anon read plicences"   on public.project_licences for select using (true);
create policy "anon insert plicences" on public.project_licences for insert with check (true);
create policy "anon delete plicences" on public.project_licences for delete using (true);

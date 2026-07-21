-- Align project_licences agreement metadata with the 002 design:
-- the agreeing user comes from the seeded public.user_directory (the remote
-- rebuild wired the FK to the empty public.users table by mistake), and
-- agreed_at defaults to now().
--
-- Replayed from the remote history (20260720071042). The drop is guarded
-- because the checked-in 002 migration already creates the constraint against
-- user_directory (public.users does not exist in the repo's schema), so on a
-- fresh `supabase db reset` this drops and recreates the same constraint.
alter table public.project_licences
  drop constraint if exists project_licences_agreed_by_user_id_fkey;

alter table public.project_licences
  add constraint project_licences_agreed_by_user_id_fkey
    foreign key (agreed_by_user_id) references public.user_directory (id)
    on delete restrict;

alter table public.project_licences
  alter column agreed_at set default now();

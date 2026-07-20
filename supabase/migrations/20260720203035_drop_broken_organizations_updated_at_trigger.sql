-- organizations has no updated_at column, but the 2026-07-20 licence rebuild
-- attached set_updated_at() to it anyway, so every organizations UPDATE
-- failed with `record "new" has no field "updated_at"`. Drop the trigger.
-- Guarded because the checked-in migrations never create it, so a fresh
-- `supabase db reset` replays this as a no-op.
drop trigger if exists organizations_set_updated_at on public.organizations;

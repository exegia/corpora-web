-- Seed the pre-auth superadmin (003): publishing decisions are gated on this
-- directory row (lib/projects SUPERADMIN_EMAIL). Idempotent by email.
insert into public.user_directory (id, email, username, name)
select gen_random_uuid(), 'manny.defreitas7@gmail.com', 'manny', 'Emmanuel De Freitas'
where not exists (
  select 1 from public.user_directory
  where email = 'manny.defreitas7@gmail.com'
);

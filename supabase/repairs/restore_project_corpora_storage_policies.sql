-- Local repair for stacks bootstrapped without storage policies.
-- Restores the existing policy contract from 20260721020000_project_publishing.sql.
-- Does not disable RLS, change bucket visibility, or replace existing policies.
begin;
DO $repair$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'anon read project corpora') then
    create policy "anon read project corpora"
  on storage.objects for select
  using (bucket_id = 'project-corpora');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'anon upload project corpora') then
    create policy "anon upload project corpora"
  on storage.objects for insert
  with check (bucket_id = 'project-corpora');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'anon update project corpora') then
    create policy "anon update project corpora"
  on storage.objects for update
  using (bucket_id = 'project-corpora')
  with check (bucket_id = 'project-corpora');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'anon delete project corpora') then
    create policy "anon delete project corpora"
  on storage.objects for delete
  using (bucket_id = 'project-corpora');
  end if;
end
$repair$;
commit;

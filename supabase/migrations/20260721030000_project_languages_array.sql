-- Multiple source languages per project (003 follow-up): scriptural corpora
-- often carry several languages (e.g. a bilingual bible). Convert
-- projects.language from a single text value to a text[] and restate the two
-- CHECK constraints in array terms. Existing single values become
-- one-element arrays.

alter table public.projects drop constraint if exists projects_classification_check;
alter table public.projects drop constraint if exists projects_language_check;

alter table public.projects
  alter column language type text[]
  using case when language is null then null else array[language] end;

alter table public.projects add constraint projects_language_check check (
  language is null or (
    cardinality(language) > 0
    and language <@ array['hebrew','greek','syriac','arabic','aramaic','protoCuneiform',
                          'akkadian','ugaritic','pali','latin','dutch','french','italian','english']
  )
);

alter table public.projects add constraint projects_classification_check check (
  (type in ('bible','tanakh','quran','apocrypha') and language is not null and category is null)
  or (type in ('biography','commentary','review') and category is not null and language is null)
  or ((type is null or type in ('lexicon','manuscript','regular'))
      and language is null and category is null)
);

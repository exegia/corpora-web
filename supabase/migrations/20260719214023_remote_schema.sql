create extension if not exists "autoinc" with schema "extensions";

create extension if not exists "http" with schema "extensions";

create extension if not exists "isn" with schema "extensions";

create extension if not exists "pg_hashids" with schema "extensions";

create extension if not exists "pg_jsonschema" with schema "extensions";

create extension if not exists "pg_trgm" with schema "extensions";

create extension if not exists "sslinfo" with schema "extensions";

create extension if not exists "vector" with schema "extensions";

create extension if not exists "wrappers" with schema "extensions";

drop trigger if exists "corpora_touch" on "public"."corpora";

drop trigger if exists "project_references_touch" on "public"."project_references";

drop trigger if exists "projects_touch" on "public"."projects";

drop policy "anon full access (temporary)" on "public"."corpora";

drop policy "anon full access (temporary)" on "public"."project_corpora";

drop policy "anon full access (temporary)" on "public"."project_references";

drop policy "anon full access (temporary)" on "public"."projects";

revoke references on table "public"."corpora" from "anon";

revoke trigger on table "public"."corpora" from "anon";

revoke truncate on table "public"."corpora" from "anon";

revoke references on table "public"."corpora" from "authenticated";

revoke trigger on table "public"."corpora" from "authenticated";

revoke truncate on table "public"."corpora" from "authenticated";

revoke references on table "public"."corpora" from "service_role";

revoke trigger on table "public"."corpora" from "service_role";

revoke truncate on table "public"."corpora" from "service_role";

revoke references on table "public"."project_corpora" from "anon";

revoke trigger on table "public"."project_corpora" from "anon";

revoke truncate on table "public"."project_corpora" from "anon";

revoke references on table "public"."project_corpora" from "authenticated";

revoke trigger on table "public"."project_corpora" from "authenticated";

revoke truncate on table "public"."project_corpora" from "authenticated";

revoke references on table "public"."project_corpora" from "service_role";

revoke trigger on table "public"."project_corpora" from "service_role";

revoke truncate on table "public"."project_corpora" from "service_role";

revoke references on table "public"."project_references" from "anon";

revoke trigger on table "public"."project_references" from "anon";

revoke truncate on table "public"."project_references" from "anon";

revoke references on table "public"."project_references" from "authenticated";

revoke trigger on table "public"."project_references" from "authenticated";

revoke truncate on table "public"."project_references" from "authenticated";

revoke references on table "public"."project_references" from "service_role";

revoke trigger on table "public"."project_references" from "service_role";

revoke truncate on table "public"."project_references" from "service_role";

revoke references on table "public"."projects" from "anon";

revoke trigger on table "public"."projects" from "anon";

revoke truncate on table "public"."projects" from "anon";

revoke references on table "public"."projects" from "authenticated";

revoke trigger on table "public"."projects" from "authenticated";

revoke truncate on table "public"."projects" from "authenticated";

revoke references on table "public"."projects" from "service_role";

revoke trigger on table "public"."projects" from "service_role";

revoke truncate on table "public"."projects" from "service_role";

alter table "public"."corpora" drop constraint "corpora_uid_key";

alter table "public"."project_corpora" drop constraint "project_corpora_corpus_id_fkey";

alter table "public"."project_corpora" drop constraint "project_corpora_project_id_fkey";

alter table "public"."project_references" drop constraint "project_references_project_id_fkey";

alter table "public"."project_references" drop constraint "project_references_title_check";

alter table "public"."projects" drop constraint "projects_name_check";

drop function if exists "public"."touch_updated_at"();

alter table "public"."corpora" drop constraint "corpora_pkey";

alter table "public"."project_corpora" drop constraint "project_corpora_pkey";

alter table "public"."project_references" drop constraint "project_references_pkey";

alter table "public"."projects" drop constraint "projects_pkey";

drop index if exists "public"."corpora_owner_id_idx";

drop index if exists "public"."corpora_pkey";

drop index if exists "public"."corpora_uid_key";

drop index if exists "public"."project_corpora_corpus_id_idx";

drop index if exists "public"."project_corpora_pkey";

drop index if exists "public"."project_references_pkey";

drop index if exists "public"."project_references_project_id_idx";

drop index if exists "public"."projects_owner_id_idx";

drop index if exists "public"."projects_pkey";

drop index if exists "public"."projects_updated_at_idx";

drop table "public"."corpora";

drop table "public"."project_corpora";

drop table "public"."project_references";

drop table "public"."projects";


  create table "public"."users" (
    "id" uuid not null,
    "display_name" text not null default 'Guest'::text,
    "avatar_url" text,
    "user_type" text not null default 'anonymous'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."users" enable row level security;

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."users" add constraint "users_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."users" validate constraint "users_id_fkey";

alter table "public"."users" add constraint "users_user_type_check" CHECK ((user_type = ANY (ARRAY['anonymous'::text, 'registered'::text, 'admin'::text]))) not valid;

alter table "public"."users" validate constraint "users_user_type_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.users (id, display_name, user_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', 'Guest'),
    case when new.is_anonymous then 'anonymous' else 'registered' end
  );
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$
;

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";


  create policy "users_select_own"
  on "public"."users"
  as permissive
  for select
  to public
using ((( SELECT auth.uid() AS uid) = id));



  create policy "users_update_own"
  on "public"."users"
  as permissive
  for update
  to public
using ((( SELECT auth.uid() AS uid) = id))
with check ((( SELECT auth.uid() AS uid) = id));


CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Download Python 128fyud_0"
  on "storage"."objects"
  as permissive
  for select
  to authenticated, supabase_read_only_user
using ((bucket_id = 'resources'::text));




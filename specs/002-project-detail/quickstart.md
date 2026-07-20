# Quickstart: Project Detail

**Feature**: 002-project-detail

## Prerequisites

- 001-project-workspace applied (schema + `/project` routes working)
- `.env` with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (see `.env.example`)
- Bun installed

## 1. Apply the migration

Copy `contracts/schema.sql` into `supabase/migrations/<timestamp>_project_detail.sql`, then apply via the Supabase MCP (`apply_migration`) or CLI (`supabase db push`). It is additive and idempotent-seeded; pre-existing projects are backfilled to the seeded default user.

## 2. Regenerate database types

```sh
supabase gen types typescript --project-id <ref> > app/types/database.ts
```

(or update `app/types/database.ts` by hand to mirror the migration, as in 001).

## 3. Run

```sh
bun install        # no new deps expected
bun run dev
```

## 4. Verify the feature

1. `/project` → create a project: creator select is **required** (seeded users appear); status badge shows `draft`.
2. Open the project → Details panel shows status, timestamps, creator, and empty type/license/organization states.
3. Classify: type `bible` → language field appears (required); switch to `commentary` → category replaces language; switch to `regular` → neither.
4. Licenses: before the catalog seed is loaded, the picker shows an explanatory empty state. After seeding `licenses`, attach two (agreement time recorded), detach one.
5. Organization: pick-or-create with name + website; remove detaches without deleting.
6. Pre-002 projects display seeded "Default User" as creator and `draft` status.

## 5. Gates (must pass before PR)

```sh
bun run typecheck && bun run lint && bun run test && bun run build
```

## Notes

- License catalog seeding is **out of band** — the user uploads their own SQL seed later; nothing in this feature writes to `licenses` or `users`.
- `owner_id` is untouched and reserved for `corpora-auth`; creator lives in `projects.user_id` → `users` (see research R4).

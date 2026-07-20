# Research: Project Detail

**Feature**: 002-project-detail | **Date**: 2026-07-19
**Status**: Complete — no NEEDS CLARIFICATION markers remained in Technical Context; research covers design decisions.

## R1 — Enum storage: `text` + CHECK constraints (not Postgres enums)

- **Decision**: Store status, type, language, and category as `text` columns with CHECK constraints listing the exact vocabulary from the shared domain enums (`corpus-core/src/enums/*.rs`, `typings/src/enums.ts`). Same for `licenses.status`.
- **Rationale**: Matches 001 precedent (`corpora.type`/`category` are text). Postgres native enums make additive vocabulary changes awkward (`ALTER TYPE ... ADD VALUE` cannot run in a transaction with other DDL) and complicate generated types. CHECK constraints still satisfy Constitution IV (integrity in the database) while staying forward-compatible (drop/re-add a constraint is transactional). TS union types (`app/types/database.ts` + literal unions in the data layer) mirror the same vocabulary at compile time.
- **Alternatives considered**: Native `CREATE TYPE ... AS ENUM` — rejected for migration friction; lookup tables per vocabulary — rejected as over-modeling for fixed, code-shared vocabularies.

## R2 — Conditional type→language/category integrity: single CHECK constraint + atomic updates

- **Decision**: Enforce FR-006–FR-009 with one CHECK constraint on `projects`:
  - `type IN ('bible','tanakh','quran','apocrypha')` ⇒ `language IS NOT NULL AND category IS NULL`
  - `type IN ('biography','commentary','review')` ⇒ `category IS NOT NULL AND language IS NULL`
  - `type IS NULL OR type IN ('lexicon','manuscript','regular')` ⇒ `language IS NULL AND category IS NULL`
  The data layer's `classifyProject` writes `type`, `language`, and `category` in one UPDATE so a type switch atomically clears the stale conditional value (FR-009); the UI mirrors the rules by swapping the conditional field.
- **Rationale**: SC-003 demands 100% enforcement of valid combinations — UI-only validation fails Constitution IV. A single constraint covering all three branches makes invalid rows unrepresentable, and last-write-wins concurrency can never produce a half-classified project because classification is one statement.
- **Alternatives considered**: Trigger-based clearing — rejected (hidden magic, harder to test); UI-only validation — rejected (Constitution IV); separate nullable `classification` JSON — rejected (weakens constraints, fights generated types).

## R3 — License modeling: read-only catalog + `project_licenses` join

- **Decision**: Split the domain `License` model (`license.rs`, which embeds `project_id`, `agreed_at`, `agreed_by_user_id`) into (a) a read-only `licenses` catalog table — `id text` primary key (natural keys like `CC-BY-4.0` for seed friendliness), title, url, domain flags, family, maintainer, `is_generic`, `license_text`, `status` — and (b) a `project_licenses` join table `(project_id, license_id)` carrying `agreed_at` and `agreed_by_user_id` per attachment. The catalog ships empty; the user uploads a SQL seed later. The UI handles an empty catalog with an explanatory empty state (FR-011).
- **Rationale**: Clarifications established the catalog is seeded and a project can hold **multiple** licenses — the domain model's one-row-per-project shape doesn't fit. A join table gives the many-to-many with per-attachment agreement metadata, and the composite PK enforces "same license attached at most once per project" (FR-010) for free. A text natural key makes the future seed human-writable and idempotent.
- **Alternatives considered**: Keep `project_id` on `licenses` (domain shape) — rejected: duplicates catalog rows per project and can't express "one or more" cleanly; uuid PK with unique slug — rejected as an extra indirection the seed doesn't need.

## R4 — Creator identity: seeded `users` table, `user_id NOT NULL` after backfill, `owner_id` untouched

- **Decision**: Create a `users` table mirroring `user.rs` (username + email required, other profile fields nullable, `auth_id uuid NULL` reserved). The migration seeds a small dummy user list with **fixed UUIDs**, including a designated default user, then adds `projects.user_id uuid REFERENCES users(id)`, backfills existing projects to the default user, and sets `NOT NULL` — making anonymous creation unrepresentable (FR-015/FR-017). The create-project dialog requires selecting a user from the directory. `ON DELETE RESTRICT` protects attribution. The 001 `owner_id` column is left untouched: it remains reserved for the Supabase-auth principal at the `corpora-auth` cutover, when seeded dummy rows are replaced/claimed via `users.auth_id`.
- **Rationale**: Clarification session chose seeded users (Option B). Fixed seed UUIDs keep the migration idempotent and testable. Keeping `user_id` (domain field name from `project.rs`) separate from `owner_id` avoids overloading the auth-reserved column with directory ids that auth would then have to migrate — the cutover stays "a policy swap, not a migration event" (Constitution IV).
- **Alternatives considered**: Reuse `owner_id` for the seeded user — rejected: collides with the auth-principal reservation; block on `corpora-auth` — rejected by clarification; free-text creator name — rejected: not a relationship, breaks FR-018.

## R5 — Organizations: separate table, `ON DELETE SET NULL`, pick-or-create

- **Decision**: `organizations` table per `organization.rs` (`name` required, `website` nullable); `projects.organization_id uuid NULL REFERENCES organizations(id) ON DELETE SET NULL`. The UI offers picking an existing organization or creating one inline (name + website); removing the association just nulls the FK.
- **Rationale**: Matches the domain model and the spec edge case — deleting/renaming an organization must never delete projects; `SET NULL` encodes exactly "removing an organization detaches it". Pick-or-create keeps orgs reusable across projects without a separate management screen.
- **Alternatives considered**: Denormalized `organization_name` text on projects — rejected: renames wouldn't propagate (spec edge case) and it isn't a relationship; full org CRUD screen — rejected as out of scope (spec: not an access-control boundary).

## R6 — UI placement: Details panel inside the existing workspace route

- **Decision**: No new route. `/project/:projectId` gains a `project-detail-panel` (status, type/classification, licenses, organization, creator, timestamps) alongside the existing corpora/references panels; edits happen through small dialogs (classify, licenses, organization) and inline status control, all posting to the existing route's `clientAction`. The create dialog on `/project` gains the required creator select, and the list shows each project's status badge.
- **Rationale**: SC-001 requires all metadata visible in a single detail view without navigating elsewhere — the workspace already is that view. Reusing the route's loader/action keeps revalidation simple and follows the 001 dialog pattern (vendored coss ui composition, Constitution constraints).
- **Alternatives considered**: Separate `/project/:id/settings` route — rejected: violates SC-001's one-view goal and adds routing surface for a panel's worth of UI; inline-editable everything — rejected: conditional classification and license agreement need focused dialogs.

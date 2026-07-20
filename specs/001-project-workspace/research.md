# Research: Project Workspace

**Feature**: 001-project-workspace | **Date**: 2026-07-19

No `NEEDS CLARIFICATION` markers remained after `/speckit-clarify`; research below records the technology decisions the plan depends on.

## R1. How the SPA talks to Supabase

- **Decision**: Use `@supabase/supabase-js` v2 directly from the browser, wrapped in a thin data-access module (`app/lib/projects.ts`). Route modules call it from React Router `clientLoader`/`clientAction` functions.
- **Rationale**: The app is `ssr: false` static SPA — there is no server to proxy through. supabase-js is the supported browser client; keeping all queries behind one module gives a single seam for testing (mock the module, not the network) and a single place to add auth headers when `corpora-auth` lands. `clientLoader`/`clientAction` are the framework-idiomatic home for reads/mutations and give revalidation for free after actions.
- **Alternatives considered**: PostgREST via raw `fetch` (loses typed client and future auth integration); TanStack Query on top of supabase-js (adds a caching layer React Router's revalidation already covers for this CRUD scope); Supabase Edge Functions as an API layer (unnecessary indirection for metadata CRUD; nothing secret to hide while access is anonymous).

## R2. Anonymous access posture (v1)

- **Decision**: Use the publishable (anon) key with RLS **enabled** on all four tables and explicit permissive policies granting `anon` select/insert/update/delete. Policies are written per-table so flipping to owner-scoped rules later is a policy swap, not a schema change.
- **Rationale**: Matches the clarified "one shared pool, accepted temporary state". Enabling RLS from day one (even with permissive policies) means the auth cutover only rewrites policies; leaving RLS off would make the cutover a riskier enable-and-hope event and triggers Supabase security advisors.
- **Alternatives considered**: RLS disabled (flagged by advisors, worse cutover path); per-device anonymous IDs (explicitly rejected in clarification Q2).

## R3. Schema forward-compatibility with `corpora-auth`

- **Decision**: Every user-ownable table carries `owner_id uuid null` (no FK yet, indexed). No FK to `auth.users` until corpora-auth ships; the column stays null in v1.
- **Rationale**: Satisfies FR-011 ("attach an owning user later without migration of meaning"). Adding the FK + backfill later is additive; renaming/remodeling would not be.
- **Alternatives considered**: Omit the column until needed (forces a migration touching every table at cutover); a separate `ownerships` join table (over-general for single-owner records).

## R4. Corpus linking vs. the manifest's `projectId`

- **Decision**: Model project↔corpus linking as a join table `project_corpora` (many-to-many), independent of the `projectId` field inside `ICorpusManifest`.
- **Rationale**: The manifest's `projectId` records compile-time provenance — which project *produced* the corpus (per the schema docs in the Corpora vault). The workspace's "link a corpus" is a workspace association: one corpus can be consulted by many projects and unlinked freely without touching corpus files or manifests. Conflating them would make unlinking a destructive manifest edit, violating FR-006.
- **Alternatives considered**: Reuse manifest `projectId` as the link (single-project-per-corpus, destructive unlink — rejected); array column of corpus ids on `projects` (loses referential integrity and per-link metadata like `linked_at`).

## R5. Corpus metadata table and stale links (FR-008)

- **Decision**: This feature reads a `corpora` table (uid, name, language, type, category, version, `hf_path` pointer to the Hugging Face bucket object, plus timestamps). `project_corpora.corpus_id` references it with `on delete cascade` — when a corpus row is deleted by the Library feature, its links disappear. "Stale" in the UI therefore means the join row exists but the corpus row is missing **or** flagged unavailable; with the FK cascade the primary stale case is a corpus whose bucket file is gone but whose row remains, surfaced via an `available` boolean the Library maintains.
- **Rationale**: Keeps referential integrity in the database instead of the UI; gives the workspace a single `available` flag to render FR-008 against. The `corpora` table is owned by the Library feature — this feature only reads it, but must create it in the initial migration since Library doesn't exist yet.
- **Alternatives considered**: No FK, links keyed by corpus uid string with existence checked at read time (pushes integrity into every query; chosen only for the `available` sub-case where the row persists).

## R6. Environment/config handling

- **Decision**: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` via Vite env (`import.meta.env`), documented in `.env.example`; `@dotenvx/dotenvx` (already a dependency) continues to manage local env files. The client module throws a clear startup error if either is missing.
- **Rationale**: Vite-standard, works with the existing Vercel deploy pipeline (env vars set per environment in Vercel), publishable key is safe to expose by design.
- **Alternatives considered**: Hardcoding project URL (breaks branch/preview databases); runtime config fetch (needless indirection for two public values).

## R7. Testing strategy

- **Decision**: Unit-test the data-access layer with a mocked supabase-js client (vi.mock of `app/lib/supabase.ts`); test route modules with `createRoutesStub`, stubbing `app/lib/projects.ts`. No live-network tests in CI.
- **Rationale**: Matches the repo's existing Vitest + Testing Library + `createRoutesStub` convention (README); mocking at the module seam keeps tests fast and deterministic and mirrors how auth will later be injected.
- **Alternatives considered**: Testing against a local Supabase stack (valuable later for RLS policy tests — noted as a follow-up when policies become owner-scoped; overkill for permissive v1 policies).

## R8. Type generation

- **Decision**: Generate `app/types/database.ts` with `supabase gen types typescript` (CLI or MCP) after applying the migration; data-access functions are typed against it.
- **Rationale**: One source of truth (the database) for row shapes; regeneration is scriptable and catches drift at typecheck time (`bun run typecheck`).
- **Alternatives considered**: Hand-written interfaces (drift risk); zod runtime validation (unneeded while the only writer is this app).

## R9. Concurrency & deletes (last-write-wins)

- **Decision**: Plain `update ... eq id` semantics — no version columns, no compare-and-swap. Deleted-elsewhere is surfaced by loader revalidation returning no row (workspace shows "no longer exists" per the spec's edge case) and mutations on missing rows reporting a clear error via the action's error state.
- **Rationale**: Clarification Q3 chose last-write-wins; React Router revalidation after every action naturally refreshes lists so sessions converge quickly.
- **Alternatives considered**: `updated_at` optimistic-concurrency check (belongs with the "detect and warn" option that was explicitly not chosen).

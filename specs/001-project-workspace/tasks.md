# Tasks: Project Workspace

**Input**: Design documents from `/specs/001-project-workspace/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: INCLUDED — Constitution v1.0.0 Principle III mandates Vitest coverage for every route module and data-access function (overrides the template's optional-tests default).

**Organization**: Tasks are grouped by user story. US1 (projects CRUD) is the MVP; US2 (corpus links) and US3 (references) are independent increments on top of it.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 = Create and manage projects, US2 = Link corpora, US3 = Manage references

## Phase 1: Setup

**Purpose**: Dependencies, database schema, environment

- [x] T001 Add Supabase client dependency: `bun add @supabase/supabase-js` (updates `package.json`, `bun.lock`)
- [ ] T002 [P] ⏳ PARTIAL (file created; **apply pending** — no Supabase credentials in this environment) Create `supabase/migrations/20260719000000_project_workspace.sql` by copying `specs/001-project-workspace/contracts/schema.sql`, then apply it to the Supabase project (CLI `supabase db push` or Supabase MCP `apply_migration`)
- [x] T003 [P] Create `.env.example` with empty `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` entries, and add real values to local `.env` (dotenvx-managed; never committed)
- [x] T004 (hand-authored to the generated format; regenerate against the live project when credentials exist) Generate typed database definitions into `app/types/database.ts` via `supabase gen types typescript` (depends on T002)

**Checkpoint**: `bun run typecheck` passes with the new types file present.

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: The client singleton, data-layer skeleton, and routing that every story builds on

- [x] T005 Create `app/lib/supabase.ts` — singleton browser client built from `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`, throwing a clear error at startup if either is missing (research R6)
- [x] T006 Create `app/lib/projects.ts` skeleton — `DataError` class (codes: `not-found` | `already-linked` | `validation` | `unavailable` | `unknown`) and the exported types `ProjectSummary`, `ProjectDetail`, `CorpusLink`, `ProjectReference`, `CorpusOption`, `ReferenceInput` exactly as specified in `specs/001-project-workspace/contracts/data-access.md`
- [x] T007 [P] Register the workspace route in `app/routes.ts`: add `route("project/:projectId", "routes/project.$projectId.tsx")` and create a placeholder `app/routes/project.$projectId.tsx` that renders the param (typegen target)

**Checkpoint**: `bun run typecheck && bun run lint` pass; `/project/abc` renders the placeholder in `bun run dev`.

## Phase 3: User Story 1 — Create and manage projects (P1) 🎯 MVP

**Goal**: Project list with create/rename/describe/delete and a workspace shell that opens per project.

**Independent Test**: Create a project, see it listed, open it, rename it, delete it (with confirmation) — no corpora or references involved (quickstart US1 row).

- [x] T008 [US1] Implement project CRUD in `app/lib/projects.ts`: `listProjects` (updated_at desc), `getProject` (null on missing), `createProject`, `updateProject`, `deleteProject`; validate name trimmed non-empty before network (FR-001), map zero-row updates/deletes to `DataError('not-found')` (contract: data-access.md)
- [x] T009 [P] [US1] Unit-test project CRUD with `vi.mock("~/lib/supabase")` in `app/lib/projects.test.ts`: happy paths, empty-name rejection, not-found mapping, error → `DataError` (never silent) (FR-013)
- [x] T010 [US1] Build project list route `app/routes/project.tsx`: `clientLoader` → `listProjects`; `clientAction` with intents `create` | `update` | `delete`; render name + relative last-updated per row; empty state inviting first project (FR-002, FR-012); inline error state on failed action (FR-013)
- [x] T011 [P] [US1] Create `app/components/project/project-form-dialog.tsx` — shared create/edit dialog (name required with inline validation, optional description) composing vendored coss ui `dialog`/`input`/`button` components
- [x] T012 [P] [US1] Create `app/components/project/delete-project-dialog.tsx` — confirmation dialog stating that references will be deleted and corpora only unlinked (FR-005)
- [x] T013 [US1] Build workspace shell in `app/routes/project.$projectId.tsx`: `clientLoader` → `getProject`; render name/description/created/updated header with rename+edit (reuses T011 dialog) and delete (T012); "no longer exists" state when loader returns null; corpora/references sections stubbed with placeholders (FR-003, FR-010)
- [x] T014 [P] [US1] Route tests with `createRoutesStub` mocking `~/lib/projects` in `app/routes/project.test.tsx`: empty state, list rendering, create submits + validation error, delete requires confirmation
- [x] T015 [P] [US1] Route tests in `app/routes/project.$projectId.test.tsx`: renders project header, rename flow, delete flow, "no longer exists" state

**Checkpoint**: All quickstart US1 checks pass in the browser; `bun run test` green. MVP deliverable.

## Phase 4: User Story 2 — Link corpora to a project (P2)

**Goal**: Link/unlink library corpora from the workspace, with duplicate prevention and stale-link handling.

**Independent Test**: Seed one `corpora` row via SQL, link it from the workspace, verify duplicate prevention and that unlinking leaves the corpus row intact (quickstart US2 + FR-008 rows).

- [x] T016 [US2] Implement link operations in `app/lib/projects.ts`: `listCorpusOptions` (all corpora + `alreadyLinked` flag), `linkCorpus` (map composite-PK violation 23505 → `DataError('already-linked')`), `unlinkCorpus`; extend `getProject` to join linked corpora with their `available` flag (FR-006, FR-007, FR-008)
- [x] T017 [P] [US2] Extend `app/lib/projects.test.ts`: options flagging, duplicate-link mapping, unlink leaves corpora untouched (assert no `corpora` delete issued), stale corpus surfaced via `available: false`
- [x] T018 [P] [US2] Create `app/components/project/link-corpus-dialog.tsx` — picker listing corpus options (name, language, type); already-linked entries indicated and disabled (FR-007); empty state when the library has no corpora
- [x] T019 [P] [US2] Create `app/components/project/corpus-link-list.tsx` — linked-corpora panel; unavailable corpora render a stale/"unavailable" treatment with a remove affordance (FR-008); unlink control per row; empty state explaining how to link (FR-012)
- [x] T020 [US2] Wire US2 into `app/routes/project.$projectId.tsx`: replace corpora stub with T019 list + T018 dialog; add `link-corpus` / `unlink-corpus` intents to the `clientAction`; surface action errors inline (FR-013)
- [x] T021 [US2] Extend `app/routes/project.$projectId.test.tsx`: link flow, duplicate indication, unlink, stale-link rendering

**Checkpoint**: Quickstart US2 and FR-008 checks pass; US1 tests still green.

## Phase 5: User Story 3 — Manage references in a project (P3)

**Goal**: Add/edit/delete bibliographic references inside the workspace.

**Independent Test**: Add a title-only reference, edit it to add an author, delete it; title-less save is rejected with a message (quickstart US3 row).

- [x] T022 [US3] Implement reference operations in `app/lib/projects.ts`: `createReference`, `updateReference`, `deleteReference`; title trimmed non-empty pre-network (FR-009); child mutations also bump `projects.updated_at` so list ordering reflects activity (contract behavioral guarantee, FR-002)
- [x] T023 [P] [US3] Extend `app/lib/projects.test.ts`: reference CRUD, empty-title rejection, `projects.updated_at` bump asserted
- [x] T024 [P] [US3] Create `app/components/project/reference-form.tsx` (title required + authors/year/publication/url fields, inline validation) and `app/components/project/reference-list.tsx` (rows with edit/delete, lighter delete confirmation per spec assumption, empty state)
- [x] T025 [US3] Wire US3 into `app/routes/project.$projectId.tsx`: replace references stub with T024 components; add `create-reference` / `update-reference` / `delete-reference` intents; inline error surfacing (FR-013)
- [x] T026 [US3] Extend `app/routes/project.$projectId.test.tsx`: add reference, validation message on empty title, edit, delete

**Checkpoint**: Quickstart US3 checks pass; all prior tests green.

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T027 [P] Handle long content gracefully in `app/components/project/` lists and the workspace header (truncation/wrapping per spec edge case) and verify very-long name/description round-trips intact
- [x] T028 [P] Guard mid-edit navigation in `app/components/project/reference-form.tsx` and `project-form-dialog.tsx` (unsaved-changes confirmation or draft preservation — spec edge case; no silent discard)
- [x] T029 Add a "Projects" navigation entry pointing at `/project` in `app/components/app-layout.tsx` sidebar if not already present, so the feature is reachable (SC-001)
- [ ] T030 ⏳ PARTIAL (all quality gates pass: typecheck, lint, test, build; **live quickstart verification pending** Supabase credentials) Run the full quickstart verification table (`specs/001-project-workspace/quickstart.md`) against a real Supabase project, then confirm all quality gates: `bun run typecheck && bun run lint && bun run test && bun run build`

## Dependencies

```text
Phase 1 (T001–T004) → Phase 2 (T005–T007) → US1 (T008–T015) → US2 (T016–T021)
                                                            ↘  US3 (T022–T026)
US2 and US3 are independent of each other (both extend the US1 workspace route,
so coordinate edits to project.$projectId.tsx if run in parallel).
Phase 6 (T027–T030) requires all implemented stories.
```

- T004 depends on T002 (schema applied before typegen); T003 can run anytime after T001
- T008 blocks T010/T013; T016 blocks T020; T022 blocks T025
- Component tasks (T011, T012, T018, T019, T024) are parallel to their story's data-layer task
- Test tasks marked [P] can be written alongside their implementation task by a second agent

## Parallel Execution Examples

- **Setup**: T002 and T003 in parallel after T001
- **US1**: after T008 lands — T009, T011, T012 in parallel; then T010/T013; then T014, T015 in parallel
- **US2**: after T016 — T017, T018, T019 in parallel; then T020, T021
- **US3**: after T022 — T023, T024 in parallel; then T025, T026
- **Polish**: T027, T028 in parallel

## Implementation Strategy

Ship US1 alone as the MVP checkpoint (project list + workspace shell, fully tested). Layer US2, then US3, validating each story's quickstart row before moving on — each phase leaves the app releasable. Suggested commits: one per task or per story phase, conventional-commit titled (e.g., `feat: project list CRUD (US1)`), targeting `dev` via PR per the constitution's branch policy.

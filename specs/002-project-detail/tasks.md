# Tasks: Project Detail

**Input**: Design documents from `/specs/002-project-detail/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: INCLUDED — Constitution v1.0.0 Principle III mandates Vitest coverage for every route module and data-access function (overrides the template's optional-tests default).

**Organization**: Tasks are grouped by user story. US1 (metadata + status) is the MVP; US2 (classification), US3 (licenses), and US4 (organization + creator display) are independent increments. The mandatory-creator change to the **create** flow is foundational (the migration makes `user_id NOT NULL`, so project creation breaks without it) even though creator *display* belongs to US4.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 = View/edit metadata & status, US2 = Classify by type, US3 = Licenses, US4 = Organization & creator

## Phase 1: Setup

**Purpose**: Database schema and typed definitions

- [x] T001 Create `supabase/migrations/20260719??????_project_detail.sql` by copying `specs/002-project-detail/contracts/schema.sql` (timestamp after the two 001 migrations), then apply it to the Supabase project (Supabase MCP `apply_migration` or CLI `supabase db push`) — includes the dummy-user seed and `user_id` backfill
- [x] T002 Extend `app/types/database.ts` with the new tables (`users`, `organizations`, `licenses`, `project_licenses`) and the new `projects` columns (`status`, `type`, `language`, `category`, `organization_id`, `user_id`), mirroring `supabase gen types` output shape (regenerate against the live project when credentials exist; depends on T001 for truth)

**Checkpoint**: `bun run typecheck` passes with the extended types.

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: Vocabulary types, the user directory, and the now-mandatory creator in the create flow — every story sits on top of these (after T001, creating a project without `user_id` violates NOT NULL)

- [x] T003 Add vocabulary + classification types to `app/lib/projects.ts`: `ProjectStatus`, `BookType`, `LanguageType`, `CategoryType`, `SCRIPTURAL_TYPES`, `CATEGORIZED_TYPES`, and the discriminated `Classification` union exactly as in `specs/002-project-detail/contracts/data-access.md`; add `"already-attached"` to `DataErrorCode`
- [x] T004 [P] Create `app/lib/users.ts` — `DirectoryUser` type and `listUsers()` (ordered by name) per contracts/data-access.md; read-only, no mutations (FR-018)
- [x] T005 [P] Unit-test `app/lib/users.test.ts` with `vi.mock("@/lib/supabase")`: list mapping, ordering, error → `DataError` (never silent)
- [x] T006 Update `createProject` in `app/lib/projects.ts` to require `userId` (throw `DataError('validation')` with a clear message when missing/empty — FR-015) and insert `user_id`; extend `app/lib/projects.test.ts` for the new validation and insert shape
- [x] T007 Extend `app/components/project/project-form-dialog.tsx` with a **required** creator select in create mode (options from the seeded directory; hidden in edit mode — creator is immutable); disable submit and explain when the directory is empty (FR-015)
- [x] T008 Wire the create flow in `app/routes/project.tsx`: `clientLoader` additionally returns `listUsers()`; `create` intent carries `userId`; extend `app/routes/project.test.tsx` for creator-required validation and the empty-directory blocked state

**Checkpoint**: `bun run typecheck && bun run lint && bun run test` pass; creating a project in `bun run dev` requires picking a creator and succeeds.

## Phase 3: User Story 1 — View and edit full project metadata (P1) 🎯 MVP

**Goal**: Details panel in the workspace showing name, description, status, and timestamps; status editable through the five-state lifecycle; status badge in the project list.

**Independent Test**: Open a pre-existing project, see its metadata with `draft` status, move it to `started`, edit the description, reload — both changes persist and the list badge updates (quickstart step 4.1–4.2).

- [x] T009 [US1] Extend `app/lib/projects.ts` reads for detail metadata: add `status`/`type` to `ProjectSummary` + list/detail column selections, and implement `updateProjectStatus(id, status)` (validates against the vocabulary, maps zero-row update → `DataError('not-found')`, touches `updated_at` — FR-002/FR-004/FR-016)
- [x] T010 [P] [US1] Extend `app/lib/projects.test.ts`: summary carries status/type, `updateProjectStatus` happy path, invalid status rejected before network, not-found mapping
- [x] T011 [P] [US1] Create `app/components/project/project-detail-panel.tsx` — metadata card composing vendored coss ui: name, description, status control (select limited to the five statuses), created/updated timestamps; slots for classification/licenses/organization/creator filled by later stories (render nothing yet)
- [x] T012 [US1] Wire the panel into `app/routes/project.$projectId.tsx`: render T011 above the corpora/references panels; add `set-status` intent to the `clientAction`; surface errors via the existing inline error pattern (FR-004, Constitution IV)
- [x] T013 [P] [US1] Extend `app/routes/project.$projectId.test.tsx`: panel renders metadata, status change submits `set-status`, only the five statuses offered, error state on failed status update
- [x] T014 [P] [US1] Add a status badge per row in `app/routes/project.tsx` list rendering (new projects show `draft`) and extend `app/routes/project.test.tsx` for badge rendering

**Checkpoint**: Quickstart 4.1–4.2 pass in the browser; `bun run test` green. MVP deliverable.

## Phase 4: User Story 2 — Classify a project by type with conditional detail (P2)

**Goal**: Type selection with conditional language (scriptural) or category (secondary literature), enforced in one atomic update and mirrored by the dialog.

**Independent Test**: Set type `bible` → language required; switch to `commentary` → category replaces language; switch to `regular` → neither; saved combinations always valid (quickstart 4.3, SC-003).

- [x] T015 [US2] Implement `classifyProject(id, classification)` in `app/lib/projects.ts`: single UPDATE writing `type` + `language` + `category` together (stale conditional cleared atomically — FR-009, research R2); client-side validation of the `Classification` union mirrors the DB constraint (`DataError('validation')` on illegal combos); extend `ProjectDetail` with `language`/`category`; touch `updated_at`
- [x] T016 [P] [US2] Extend `app/lib/projects.test.ts`: each classification branch (scriptural+language, categorized+category, neutral, null), atomic clearing asserted on the update payload, illegal combos rejected before network
- [x] T017 [P] [US2] Create `app/components/project/classify-dialog.tsx` — type select over the ten book types; conditional second field swaps per selection (language for scriptural, category for secondary literature, none otherwise); save disabled until the required conditional value is chosen (FR-006–FR-008)
- [x] T018 [US2] Wire classification into `app/routes/project.$projectId.tsx` + `app/components/project/project-detail-panel.tsx`: show current type/language/category (or "Unclassified"), open T017 dialog, add `classify` intent to the `clientAction`
- [x] T019 [P] [US2] Extend `app/routes/project.$projectId.test.tsx`: conditional field swap per type, save-blocked-until-valid, type-switch clears the stale value in the submitted payload, unclassified state renders

**Checkpoint**: Quickstart 4.3 passes; a manual psql insert violating the combination is rejected by `projects_classification_check` (spot-check once).

## Phase 5: User Story 3 — Attach licenses to a project (P3)

**Goal**: Browse the seeded catalog, attach one or more licenses with recorded agreement, detach individually; graceful empty catalog pre-seed.

**Independent Test**: With `licenses` seeded (temporary local seed), attach two licenses (agreement time + user recorded), verify the duplicate is blocked, detach one; with an empty catalog, the picker explains no licenses exist yet (quickstart 4.4).

- [x] T020 [US3] Create `app/lib/licenses.ts` — `CatalogLicense`/`AttachedLicense` types, `listLicenses()`, `attachLicense(projectId, licenseId, agreedByUserId)` (23505 → `DataError('already-attached')`), `detachLicense(projectId, licenseId)`; both mutations touch `projects.updated_at` (FR-010–FR-013, contracts/data-access.md)
- [x] T021 [P] [US3] Unit-test `app/lib/licenses.test.ts` with the client mocked: catalog mapping (domain flags, status), empty catalog → `[]`, duplicate-attach mapping, detach leaves other rows (assert delete filtered by both keys), error propagation
- [x] T022 [US3] Extend `getProject` in `app/lib/projects.ts` to join attached licenses (`project_licenses` → `licenses` + agreeing user) into `ProjectDetail.licenses`, sorted by `agreed_at`; extend `app/lib/projects.test.ts` for the joined shape
- [x] T023 [P] [US3] Create `app/components/project/license-dialog.tsx` — catalog browser (title, domain badges, lifecycle state with retired/superseded visibly discouraged, link to text), agreement confirmation step before attach, already-attached entries disabled; empty-catalog state explaining the seed hasn't loaded (FR-011)
- [x] T024 [US3] Wire licenses into `app/routes/project.$projectId.tsx` + `project-detail-panel.tsx`: attached-license list with per-row detach and agreement metadata, `attach-license` / `detach-license` intents in the `clientAction` (agreeing user = creator pre-auth; see plan Constraints)
- [x] T025 [P] [US3] Extend `app/routes/project.$projectId.test.tsx`: attached list renders with agreement info, attach flow requires confirmation, duplicate shows "already attached" error, detach removes one row only, empty-catalog state

**Checkpoint**: Quickstart 4.4 passes with and without a seeded catalog; US1/US2 tests still green.

## Phase 6: User Story 4 — Associate an organization and creator (P4)

**Goal**: Pick-or-create a single organization per project; creator always displayed (backfilled default user for pre-002 projects).

**Independent Test**: Assign a new organization (name + website) and see it on the project; remove it (project intact); creator shows the selected user on new projects and "Default User" on pre-002 projects (quickstart 4.5–4.6).

- [x] T026 [US4] Create `app/lib/organizations.ts` — `Organization` type, `listOrganizations()` (ordered by name), `createOrganization` (required trimmed name → `DataError('validation')` — FR-014) per contracts/data-access.md
- [x] T027 [P] [US4] Unit-test `app/lib/organizations.test.ts` with the client mocked: list ordering, create validation, error propagation
- [x] T028 [US4] Extend `app/lib/projects.ts`: `getProject` joins `creator` (never null — FR-015) and `organization` into `ProjectDetail`; implement `setProjectOrganization(id, organizationId | null)` touching `updated_at`; extend `app/lib/projects.test.ts` for both
- [x] T029 [P] [US4] Create `app/components/project/organization-dialog.tsx` — pick an existing organization or create one inline (name required, website optional); remove affordance when one is assigned (FR-014, research R5)
- [x] T030 [US4] Wire into `app/routes/project.$projectId.tsx` + `project-detail-panel.tsx`: creator line (name or username — FR-015) and organization display with assign/change/remove via T029; `set-organization` / `create-organization` intents in the `clientAction`
- [x] T031 [P] [US4] Extend `app/routes/project.$projectId.test.tsx`: creator renders (including backfilled default-user case), assign/create/remove organization flows, project remains after removal

**Checkpoint**: Quickstart 4.5–4.6 pass; full detail panel now shows every SC-001 field in one view.

## Phase 7: Polish & Cross-Cutting

- [x] T032 [P] Verify pre-002 compatibility end-to-end (FR-017/SC-005): a project row created before the migration shows `draft`, unclassified, no licenses, no organization, and "Default User" — add a route-test fixture for this shape in `app/routes/project.$projectId.test.tsx` if not already covered
- [x] T033 [P] Run the full quickstart (`specs/002-project-detail/quickstart.md`) in the browser against the live Supabase project and tick every step
- [x] T034 Final gates: `bun run typecheck && bun run lint && bun run test && bun run build` all green (CI parity)

## Dependencies

```text
Phase 1 (T001–T002)
  └─► Phase 2 (T003–T008)  ← create flow must carry user_id once migration applies
        ├─► Phase 3 / US1 (T009–T014) 🎯 MVP
        ├─► Phase 4 / US2 (T015–T019)  — independent of US1 except shared files (see below)
        ├─► Phase 5 / US3 (T020–T025)  — independent of US1/US2 except shared files
        └─► Phase 6 / US4 (T026–T031)  — independent of US1–US3 except shared files
              └─► Phase 7 (T032–T034)
```

- **Shared-file serialization**: `app/lib/projects.ts`, `project-detail-panel.tsx`, `project.$projectId.tsx`, and their tests are touched by multiple stories — tasks on the same file are sequential (no [P]); stories can still be *delivered* in any order after Phase 2, but touching-tasks must not run concurrently.
- US3's `attach-license` uses the project creator as the agreeing user — needs only Phase 2 (users exist), not US4.

## Parallel Examples

- Phase 2: T004+T005 (users module + test) alongside T003; T007 alongside T006.
- US1: T010, T011 in parallel after T009; T013, T014 in parallel after T012.
- US3: T021, T023 in parallel after T020; T025 after T024.
- Cross-story (multiple contributors): US3 T020/T021 (new `licenses.ts`) and US4 T026/T027 (new `organizations.ts`) are fully parallel with each other and with US1 UI tasks.

## Implementation Strategy

**MVP = Phase 1 + 2 + 3** (migration, mandatory creator in create flow, details panel with status). Ship it, then add classification (US2), licenses (US3), and organization/creator display (US4) as independent increments — each ends on a green-gate checkpoint. Suggested single-developer order: straight through T001→T034; the [P] markers matter mainly if work is split across agents/sessions.

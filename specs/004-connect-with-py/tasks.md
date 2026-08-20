# Tasks: Connect the corpus library to the real conversion service

**Input**: Design documents from `specs/004-connect-with-py/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/corpora-api.md, quickstart.md
**Tests**: Included — the constitution (Principle III) makes route-module and data-access tests NON-optional.
**Organization**: Grouped by the spec's user stories; US1 alone is the MVP.

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

Single SPA per plan.md: modules under `app/lib/`, components under
`app/components/corpus/`, routes under `app/routes/`, migrations under
`supabase/migrations/`.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Environment and dependency groundwork; no behavior change.

- [X] T001 Add `VITE_CORPORA_API_URL` to `.env.example` (documented per its naming-rule header) and to the local `.env` via dotenvx
- [X] T002 Add the `yaml` runtime dependency with `bun add yaml` (justified in plan.md Complexity Tracking) and confirm `bun run build` bundles it without vite `optimizeDeps` additions
- [X] T003 [P] New migration `supabase/migrations/<ts>_corpus_document_toc.sql`: `alter table public.corpus_documents add column if not exists description text, add column if not exists toc jsonb;` — apply to the local stack (docker exec psql + `NOTIFY pgrst, 'reload schema'`) and remote `ivaecofevxactmmupvyp` (MCP apply_migration; needs user approval), extend `app/types/database.ts`

**Checkpoint**: typecheck/test/build green with no behavior change.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The two seam modules every story consumes.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Create `app/lib/corpora-api.ts` per data-model.md: `CORPORA_API_URL`, `JobStatusMessage`, `SourceFormat`, `detectSourceFormat` (`.xml→tei` mapping — never send `xml`), `CorporaApiError` with the status→kind table, `apiFetch` attaching the Supabase bearer token when a session exists, memoized `fetchCapabilities`, `createConversion`, `getConversion`, `downloadConversion`, `validateConversion` (never throws → `"skipped"`)
- [X] T005 Create `app/lib/corpora-api.test.ts`: fetch mocked — error-kind mapping (413/422/429/409/404/401/403/5xx/network), bearer attached only with a session, capabilities memoization + UNKNOWN fallback, multipart field names
- [X] T006 [P] Create `app/lib/corpus-archive.ts` per data-model.md: shared unzip helper extracted from `app/lib/corpus-history.ts` (refactor its `unzipSync` call to use it), `readCorpusArchive` parsing `manifest.yml` + `toc.yml` with per-field degradation (nulls/[]), manifest `type` → `CorpusType` mapping with `"text"` fallback
- [X] T007 [P] Create `app/lib/corpus-archive.test.ts`: fixture archives built in-test with fflate — full manifest+toc parse, missing manifest, malformed toc, unreadable zip throws `DataError("validation")`; `app/lib/corpus-history.test.ts` still green after the unzip refactor
- [X] T008 Extend `app/lib/corpus.ts`: `CorpusDocument`/`DocumentRow`/`DOCUMENT_COLUMNS`/`toDocument`/`createCorpusDocument` gain `description` and `toc` (typed `CorpusSection[] | null`); update the `peshitta`-style fixtures and `vi.mock` factories in `app/routes/corpus.test.tsx`, `app/routes/corpus.$documentId.test.tsx`, `app/routes/project.$projectId.test.tsx`

**Checkpoint**: Seams exist and are tested; UI still runs on the simulated transport.

## Phase 3: User Story 1 — Convert a document for real (Priority: P1) 🎯 MVP

**Goal**: The pill/drawer flow runs against api.exegia.co; success persists an authentic corpus (manifest metadata + real nested-git history) to Supabase.

**Independent Test**: Convert a small TEI file end-to-end (preview against the live service); the new library row's metadata and version history match the archive; route tests cover the mapped state machine with `@/lib/corpora-api` mocked.

### Implementation for User Story 1

- [X] T009 [US1] Rewrite `runConversion` in `app/lib/corpus-convert.ts` as the real transport per research.md R5: `createConversion` → 2 s poll loop (injectable `delay`, `signal`-aborted) → `succeeded` → `validating` (validateConversion) → `downloadConversion` → `ready` with `corpusBlob` + real `validation.stats`; server statuses/logs mapped onto the existing `ConversionEntry`; keep the public surface (`CONVERSION_STEPS`, `deriveSteps`, `deriveProgress`, `currentStep`, `createConversionEntry`, `formatBytes`) unchanged; add `corpusBlob?: Blob` to `ConversionEntry`
- [X] T010 [US1] Delete `fabricateStats`/`fabricateSections`/`shouldFail` from `app/lib/corpus-convert.ts`; move `detectSourceFormat` consumers to `@/lib/corpora-api`; rewrite `app/lib/corpus-convert.test.ts` against a mocked `@/lib/corpora-api` (status walk queued→running→succeeded with contract-shaped payloads, failed job carries the server error string, abort stops polling)
- [X] T011 [US1] Update `app/components/corpus/convert/use-conversion.ts`: `start(file)` validates `detectSourceFormat` before upload (unsupported → inline error, nothing sent); on `ready` run `readCorpusArchive(corpusBlob)` + `extractCorpusHistory(blob as File)` in parallel, `uploadCorpusFile(new File([blob], \`${name}.corpus\`))`, then submit `convert-document` with real fields (description, toc JSON, language, corpusType, nodes from stats `max_slot`, sizeBytes = archive size, real commits); drop `uploadConversionSource` from this path
- [X] T012 [US1] Update the `convert-document` action in `app/routes/corpus.tsx` to parse/pass the new fields (description, toc, commits) into `createCorpusDocument`; keep `{ok, intent, documentId}` envelope
- [X] T013 [US1] Update `app/routes/corpus.test.tsx` conversion tests: scripted `runConversion` mock emits contract-shaped entries; assert `convert-document` called with archive-derived fields and real commits; pill/drawer text assertions updated for real log lines
- [X] T014 [US1] Remove `uploadConversionSource` from `app/lib/corpus.ts` if no caller remains (and from the route-test mock factories); `bun run typecheck && bun run test`
- [ ] T015 [US1] Preview verification against the live service per quickstart.md: convert a small `.tei`/`.xml` fixture, confirm the 3-line server log sequence in the drawer, the persisted row's metadata/history, and the stored `.corpus` in the `project-corpora` bucket

**Checkpoint**: MVP — real conversions land authentic corpora; ship-ready alone.

## Phase 4: User Story 2 — Survive an unreliable service (Priority: P2)

**Goal**: Every FR-006 failure mode surfaces a distinct, retryable message.

**Independent Test**: Route tests drive each `CorporaApiError.kind` through a mocked transport and assert its message + Retry; a live 429/413 cannot be forced, so contract tests stand in.

### Implementation for User Story 2

- [X] T016 [P] [US2] Map `CorporaApiError.kind` → user-facing copy in `app/components/corpus/convert/utils.ts` (unreachable, unauthorized→"sign in", too-large with the 500 MiB limit, unsupported with the format list, queue-full, job-forgotten, download-failed) and render it in the failed step's log + file-summary status
- [X] T017 [US2] Handle mid-flight job loss in `runConversion` (`app/lib/corpus-convert.ts`): a 404 after a prior successful poll terminates as `error` with the job-forgotten message; a 404/network error on the *first* poll retries up to 3 intervals before failing (instance fan-out tolerance per research.md); download/validate failures after `succeeded` fail the `index` step without persisting
- [X] T018 [US2] Extend `app/lib/corpus-convert.test.ts`: first-poll fan-out retry, mid-flight 404 → job-forgotten error, download failure → no persist; extend `app/routes/corpus.test.tsx`: each error kind renders its copy and Retry re-invokes `runConversion`
- [X] T019 [US2] Pre-upload guards in `use-conversion.ts`: file > 500 MiB → immediate too-large message (no request); `fetchCapabilities` consulted once per session to warm the auth posture (401 path renders sign-in copy)

**Checkpoint**: All failure drills pass in tests; honest states everywhere.

## Phase 5: User Story 3 — Real section data on the detail page (Priority: P3)

**Goal**: Detail Overview shows the archive's captured toc; legacy rows show an explicit empty state.

**Independent Test**: Detail route test renders a document fixture with `toc` (real rows) and with `toc: null` (empty state); `fabricateSections` is gone.

### Implementation for User Story 3

- [X] T020 [P] [US3] Update `app/routes/corpus.$documentId.tsx` + `app/components/corpus/detail/overview-table.tsx`: render `document.toc ?? []`; empty state "No section data was captured for this corpus." replaces `fabricateSections(document.id)`; show `document.description` under the header when present
- [X] T021 [US3] Update `app/routes/corpus.$documentId.test.tsx`: toc-driven rows, legacy empty state, description rendering

**Checkpoint**: No fabricated values remain anywhere (SC-003).

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T022 [P] Docs: note the corpora-py seam + poll-only rationale in `CLAUDE.md`'s conventions table (link `specs/004-connect-with-py/contracts/corpora-api.md`) and record upstream tickets #102–#105 as adoption points (esp. #103 → thin `corpus-archive.ts` when job-result detail endpoints land)
- [ ] T023 Gates: `bun run typecheck && bun run lint && bun run test && bun run build` (only pre-existing lint warnings); confirm no live network in tests (grep for unmocked `corpora-api` imports in test setup)
- [ ] T024 Final live pass per quickstart.md smoke tests + failure drills; update `.remember`/memory feature-state note

## Dependencies

- Phase 1 → Phase 2 → US1 (T009–T015) → US2 (T016–T019) → US3 (T020–T021) → Polish
- US2 depends on US1's transport; US3 only on Phase 1's migration + Phase 2's types (could run parallel to US2 if staffed separately)

## Parallel Execution Examples

- Phase 1: T003 alongside T001/T002
- Phase 2: T006+T007 (archive module) parallel to T004+T005 (API client); T008 after both
- US2: T016 parallel to T017; US3: T020 parallel to any US2 task

## Implementation Strategy

MVP = Phases 1–3 (real conversions, authentic persistence) — shippable alone
behind no flag since the simulated path is fully replaced. US2 hardens
failure UX; US3 finishes SC-003. Each checkpoint ends with the full gate
suite; commit per phase with the repo's emoji-subject convention.

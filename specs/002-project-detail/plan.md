# Implementation Plan: Project Detail

**Branch**: `002-project-detail` | **Date**: 2026-07-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-project-detail/spec.md`

## Summary

Complete the project feature by giving every project full metadata: lifecycle status (draft/started/progress/completed/failed), an optional book type with conditional language (scriptural types) or category (secondary-literature types), zero or more attached licenses from a read-only seeded catalog (agreement time + agreeing user per attachment), at most one organization, and a mandatory creating user selected from a pre-seeded user directory. Implementation extends the 001 Supabase schema additively (new `users`, `organizations`, `licenses`, `project_licenses` tables; new columns on `projects` with CHECK-enforced conditional integrity), extends the existing data-access seam (`app/lib/`), and adds a Details panel to the existing `/project/:projectId` workspace plus a creator picker in the create-project dialog. No new runtime dependencies.

## Technical Context

**Language/Version**: TypeScript ~7.0, React 19
**Primary Dependencies**: React Router v8 (framework mode, SPA `ssr: false`), `@supabase/supabase-js` v2 (already present from 001), Tailwind CSS v4 + vendored coss ui components, Bun (package manager/scripts). No new runtime dependencies.
**Storage**: Supabase Postgres (`public` schema) — additive migration on the 001 schema. License catalog and user directory are seed-populated (licenses seeded later by the user's own SQL seed; dummy users seeded by this feature's migration). Corpus files (Hugging Face bucket) untouched.
**Testing**: Vitest 4 + Testing Library (jsdom), `createRoutesStub` for route modules, Supabase client mocked at the data-access boundary (same seams as 001)
**Target Platform**: Static SPA (`build/client/`), evergreen browsers, deployed to Vercel per repo CI policy
**Project Type**: Web application (frontend-only SPA; Supabase is the backend)
**Performance Goals**: Detail view interactive in <1s on broadband (SC-001); classification flow completable in <30s (SC-002); license attach flow in <1min (SC-004); mutations reflected in <500ms perceived
**Constraints**: Online-required; shared-pool, last-write-wins concurrency carried over from 001; creator selection is honor-system (no passwords) until `corpora-auth`; conditional type/language/category integrity MUST hold in the database, not just the UI (SC-003, Constitution IV); pre-002 projects must remain valid with defaults and a backfilled creator (FR-017)
**Scale/Scope**: Small user pool (pre-auth); ~50 projects, tens of catalog licenses, ~dozen seeded users; 1 extended route (`/project/:projectId` Details panel), 1 extended dialog (create project), ~4 new dialogs/panels

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution v1.0.0 (ratified 2026-07-19):

| Principle | Assessment |
| --- | --- |
| I. Spec-Driven Delivery | PASS — spec written, clarified (5 recorded clarifications), plan before tasks; no [NEEDS CLARIFICATION] left |
| II. Static SPA, Managed Backends | PASS — no server runtime added; all new capabilities are Supabase tables + `app/lib/` data-access modules; routes never touch supabase-js directly |
| III. Tested at the Seams | PASS — plan includes Vitest coverage for every new/changed data-access function and route module, client mocked at module boundary |
| IV. Data Integrity & Forward-Compatible Schema | PASS — status/type/language/category enforced by CHECK constraints; FKs with explicit `on delete`; RLS enabled on all new tables (permissive pre-auth posture); additive columns only, `owner_id` left untouched for the auth cutover; `users.auth_id` reserved for claim-mapping |
| V. Branch & Release Discipline | PASS — numbered feature branch `002-project-detail` targeting `dev`; Spec Kit artifacts committed at each step |

**Pre-Phase-0 result**: PASS — no violations, Complexity Tracking empty.

**Post-Phase-1 re-check**: PASS — design adds zero dependencies, four tables + five `projects` columns (additive), three new data-access modules plus extensions to `app/lib/projects.ts`, and UI inside the existing route. The domain `License` model's embedded `project_id`/`agreed_*` fields are normalized into a `project_licenses` join table to support the clarified one-to-many shape — recorded in research R3; no constitution violation.

## Project Structure

### Documentation (this feature)

```text
specs/002-project-detail/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── schema.sql       # Phase 1 output — additive Postgres DDL + dummy-user seed (Supabase migration)
│   └── data-access.md   # Phase 1 output — TS data-access contract
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
app/
├── routes/
│   ├── project.tsx                  # extend: creator picker in create flow; status badge in list
│   └── project.$projectId.tsx       # extend: Details panel (status, type, licenses, org, creator)
├── components/
│   └── project/
│       ├── project-form-dialog.tsx  # extend: required creator select (seeded users)
│       ├── project-detail-panel.tsx # NEW: metadata display + edit affordances
│       ├── classify-dialog.tsx      # NEW: type + conditional language/category
│       ├── license-dialog.tsx       # NEW: browse catalog, agree & attach; list/remove attached
│       └── organization-dialog.tsx  # NEW: pick-or-create org, assign/remove
├── lib/
│   ├── projects.ts                  # extend: detail metadata read/update, classify, org assign
│   ├── licenses.ts                  # NEW: catalog list + attach/detach with agreement
│   ├── users.ts                     # NEW: seeded user directory list
│   └── organizations.ts             # NEW: list/create organizations
└── types/
    └── database.ts                  # extend: new tables/columns (mirrors gen types)

app/lib/*.test.ts                    # data-access tests (client mocked)
app/routes/project.test.tsx          # extend
app/routes/project.$projectId.test.tsx # extend
supabase/
└── migrations/20260719??????_project_detail.sql  # contracts/schema.sql applied
```

**Structure Decision**: Stay inside the single-SPA layout. No new routes — the Details panel lives in the existing `/project/:projectId` workspace (SC-001: one view, no extra navigation). One new `app/lib/` module per new domain (licenses, users, organizations) per Constitution II; `projects.ts` keeps project-owned mutations. The migration is additive on the 001 schema.

## Complexity Tracking

No constitution violations to justify — table intentionally empty.

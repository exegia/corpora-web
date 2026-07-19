# Implementation Plan: Project Workspace

**Branch**: `001-project-workspace` | **Date**: 2026-07-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-project-workspace/spec.md`

## Summary

Build the `/project` area of corpora-web: a project list plus a per-project workspace where users create/manage projects, link corpora from the library, and manage bibliographic references. All metadata (projects, corpus links, references, corpus records) lives in Supabase Postgres, accessed directly from the SPA via `@supabase/supabase-js` in React Router `clientLoader`/`clientAction` functions. Corpus files themselves live in Hugging Face bucket storage and are out of scope — this feature reads/writes metadata only. Access is anonymous in v1 (one shared pool, last-write-wins); the schema carries nullable ownership columns so the parallel `corpora-auth` project can attach users later without remodeling.

## Technical Context

**Language/Version**: TypeScript ~7.0, React 19
**Primary Dependencies**: React Router v8 (framework mode, SPA `ssr: false`), `@supabase/supabase-js` v2 (to be added), Tailwind CSS v4 + coss ui components (Base UI primitives, vendored in `app/components/ui`), Bun (package manager/scripts)
**Storage**: Supabase Postgres for all metadata (projects, corpus links, references, corpus records). Hugging Face bucket for corpus files — referenced by corpus metadata, never touched by this feature
**Testing**: Vitest 4 + Testing Library (jsdom), `createRoutesStub` for route modules, Supabase client mocked at the data-access layer
**Target Platform**: Static SPA (`build/client/`), evergreen browsers, deployed to Vercel per repo CI policy
**Project Type**: Web application (frontend-only SPA; Supabase is the backend)
**Performance Goals**: Project list interactive in <1s on broadband (supports SC-001/SC-004); mutations reflect in UI in <500ms perceived (optimistic or fast revalidation)
**Constraints**: Online-required (no offline mode); anonymous access v1 — one shared data pool, permissive RLS as an accepted temporary posture; last-write-wins concurrency (no conflict detection); schema must accept an owning user later without migration of meaning (nullable `owner_id` columns from day one)
**Scale/Scope**: Small user pool (pre-auth); on the order of 50 projects / low hundreds of metadata rows; 2 routes (`/project` list, `/project/:id` workspace) plus dialogs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template — no ratified principles exist, so there are no enforceable gates for this feature. **PASS (by default).**

Judgment-call checks applied in its absence: single project structure (no new packages), no new architectural layers beyond a thin data-access module, tests planned for all route modules and data-access functions. Recommend running `/speckit-constitution` before the next feature so future plans have real gates.

**Post-Phase-1 re-check**: Design adds one dependency (`@supabase/supabase-js`), two route modules, one data-access module, and four tables. No violations to justify; Complexity Tracking left empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-project-workspace/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── schema.sql       # Phase 1 output — Postgres DDL (Supabase migration)
│   └── data-access.md   # Phase 1 output — TS data-access contract
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
app/
├── routes.ts                    # add route("project/:projectId", ...)
├── routes/
│   ├── project.tsx              # project list (clientLoader + clientAction)
│   └── project.$projectId.tsx   # project workspace (corpora + references panels)
├── components/
│   ├── project/                 # feature components (dialogs, panels, cards)
│   │   ├── project-form-dialog.tsx
│   │   ├── delete-project-dialog.tsx
│   │   ├── link-corpus-dialog.tsx
│   │   ├── corpus-link-list.tsx
│   │   └── reference-form.tsx / reference-list.tsx
│   └── ui/                      # existing vendored coss ui (unchanged)
├── lib/
│   ├── supabase.ts              # singleton browser client (env-driven)
│   └── projects.ts              # data-access layer: typed CRUD for projects/links/references
└── types/
    └── database.ts              # generated Supabase types (supabase gen types)

app/routes/__tests__/ (or co-located *.test.tsx per existing convention)
├── project.test.tsx
└── project.$projectId.test.tsx
supabase/
└── migrations/                  # schema.sql applied as initial migration
```

**Structure Decision**: Stay inside the existing single-SPA layout. New code is two route modules, a `app/components/project/` feature folder, and a two-file `app/lib/` data layer. The Supabase DDL lives in `supabase/migrations/` so it can be applied via CLI or MCP; no server code is added anywhere.

## Complexity Tracking

No constitution violations to justify — table intentionally empty.

# Implementation Plan: Connect the corpus library to the real conversion service

**Branch**: `chore/connect-with-py` | **Date**: 2026-08-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/004-connect-with-py/spec.md`

## Summary

Replace the simulated conversion transport shipped in PR #65 with the deployed
corpora-py backend at `https://api.exegia.co`. The state model already mirrors
the backend's contract by design, so the change is confined to the data-access
layer: a new typed API client (`app/lib/corpora-api.ts`), a rewritten
`runConversion` body (poll-driven job tracking), client-side archive parsing
for authentic metadata (`app/lib/corpus-archive.ts`), and an additive schema
extension (`toc`, `description`). Supabase remains the registry and file store;
corpora-py is compute only. MCP is wired into dev tooling, not the SPA.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, React Router 7 (SPA, `ssr: false`)
**Primary Dependencies**: existing — fflate (unzip), isomorphic-git (history), Supabase JS; new — `yaml` (~tiny, parse `manifest.yml`/`toc.yml`; justified in Complexity Tracking)
**Storage**: Supabase Postgres (`corpus_documents`) + Supabase Storage (`project-corpora` bucket); corpora-py holds nothing durable for us
**Testing**: Vitest + Testing Library; all network mocked at the `app/lib/` module boundary (Principle III)
**Target Platform**: static SPA (Vercel) calling `https://api.exegia.co` cross-origin (CORS `*` verified)
**Project Type**: web application (frontend only; backend is external)
**Performance Goals**: poll interval 2 s; failure surfaced within one interval; conversion UX unchanged from #65
**Constraints**: backend jobs are in-memory per instance (mid-flight 404 is a normal state); WS unreliable on Vercel — polling is mandatory and is what advances the job; 500 MiB upload cap; 429 when queue full; `auth_required:false` today but bearer-ready client required
**Scale/Scope**: single-user-visible flows; 2 global conversion workers server-side

## Constitution Check

| Principle | Verdict | Notes |
|---|---|---|
| I. Spec-Driven Delivery | PASS | spec.md precedes this plan; ambiguities resolved (architecture + MCP scope confirmed with the user; transport decision documented in research.md R1) |
| II. Static SPA, Managed Backends | PASS | No server runtime added. All HTTP to corpora-py lives in one seam module `app/lib/corpora-api.ts`; routes keep importing only from `app/lib/*`. Corpus files stay in Supabase Storage, never the database |
| III. Tested at the Seams | PASS | `corpora-api.ts` tested with `fetch` mocked; `corpus-convert.ts` route tests keep mocking `runConversion` (unchanged surface); no live network in CI |
| IV. Data Integrity & Forward-Compatible Schema | PASS | Additive nullable columns only (`toc jsonb`, `description text`); RLS posture unchanged; failed conversions persist nothing |
| V. Branch & Release Discipline | PASS | `chore/connect-with-py` → `release/v0.9.0`; conventional PR title without emoji |

*Post-design re-check (after Phase 1 artifacts): PASS — no new violations introduced; the single justified addition is the `yaml` dependency (see Complexity Tracking).*

## Project Structure

### Documentation (this feature)

```
specs/004-connect-with-py/
├── plan.md          # this file
├── spec.md
├── research.md      # backend facts + decisions (Phase 0)
├── data-model.md    # client modules, entry mapping, schema (Phase 1)
├── quickstart.md    # env, local backend, MCP tooling, smoke tests
├── tickets.md       # issue-ready upstream tickets (gap analysis)
└── contracts/
    └── corpora-api.md
```

### Source Code (repository root)

```
app/
├── lib/
│   ├── corpora-api.ts        # NEW: the single HTTP seam to api.exegia.co
│   ├── corpora-api.test.ts   # NEW
│   ├── corpus-archive.ts     # NEW: manifest.yml/toc.yml reader (shares unzip with corpus-history)
│   ├── corpus-archive.test.ts# NEW
│   ├── corpus-convert.ts     # MODIFIED: runConversion body → real transport; fabricate* retired from success path
│   ├── corpus-convert.test.ts# MODIFIED
│   ├── corpus-history.ts     # unchanged (already reads the nested .git)
│   └── corpus.ts             # MODIFIED: createCorpusDocument gains toc/description
├── components/corpus/…       # unchanged surfaces (pill/drawer/detail read the same types)
└── routes/corpus.tsx         # MODIFIED: convert-document action passes the new fields
supabase/migrations/<ts>_corpus_document_toc.sql   # NEW: toc jsonb, description text
.env.example                  # MODIFIED: VITE_CORPORA_API_URL
.mcp.json                     # NEW: corpora MCP server (dev tooling)
```

**Structure Decision**: Frontend-only change inside the existing SPA layout;
the external backend contributes no code to this repository.

## Complexity Tracking

| Addition | Justification | Alternative rejected |
|---|---|---|
| `yaml` runtime dependency (~30 KB) | `manifest.yml` and `toc.yml` inside `.corpus` archives are YAML; hand-rolling a parser for nested toc structures is more code and more fragile than the standard parser | Hand-rolled line parser (breaks on nested/quoted values); asking the backend for JSON (ticket 2 filed upstream, not available today) |
| Client-side archive parsing at convert time | The backend's corpus-detail endpoints only serve HF-published archives; prod is `hub_writable:false`, so job results are unreachable through them | Publishing every conversion to HF storage (impossible: read-only prod); keeping fabricated data (violates SC-003) |

## Phase 0 → [research.md](research.md) · Phase 1 → [data-model.md](data-model.md), [contracts/corpora-api.md](contracts/corpora-api.md), [quickstart.md](quickstart.md)

Implementation task breakdown follows via `/speckit-tasks` (not part of this plan).

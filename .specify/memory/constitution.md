<!--
Sync Impact Report
- Version change: (template, unversioned) → 1.0.0
- Modified principles: all placeholders replaced (initial adoption)
  - [PRINCIPLE_1_NAME] → I. Spec-Driven Delivery
  - [PRINCIPLE_2_NAME] → II. Static SPA, Managed Backends
  - [PRINCIPLE_3_NAME] → III. Tested at the Seams
  - [PRINCIPLE_4_NAME] → IV. Data Integrity & Forward-Compatible Schema
  - [PRINCIPLE_5_NAME] → V. Branch & Release Discipline
- Added sections: Additional Constraints; Development Workflow & Quality Gates
- Removed sections: none (template slots filled)
- Templates:
  - ✅ .specify/templates/plan-template.md — generic Constitution Check slot; compatible, no edit needed
  - ✅ .specify/templates/spec-template.md — aligned (business-facing specs per Principle I); no edit needed
  - ✅ .specify/templates/tasks-template.md — aligned; note Principle III makes test tasks NON-optional
    for route modules and data-access layers despite the template's "Tests are OPTIONAL" default
  - ✅ .specify/templates/checklist-template.md — no constitution references; no edit needed
- Follow-up TODOs: none
-->

# corpora-web Constitution

## Core Principles

### I. Spec-Driven Delivery

Every feature MUST flow through the Spec Kit pipeline before implementation:
specification → clarification → plan → tasks. Specifications MUST describe user value in
technology-agnostic terms; implementation detail belongs in plans and contracts. Material
ambiguities MUST be resolved (clarification session or documented assumption) before planning,
and every requirement MUST be testable. Feature work that skips these gates MUST be treated as
exploratory spike work and MUST NOT merge to `dev`.

**Rationale**: The repo exists inside a multi-app Corpora ecosystem (web, auth, library,
desktop) built in parallel; written, clarified specs are the coordination contract between them.

### II. Static SPA, Managed Backends

corpora-web MUST remain a statically built single-page app (`ssr: false`); no server runtime is
added to this repository. Backend capabilities MUST come from managed services — Supabase
Postgres for metadata, Hugging Face bucket storage for corpus files — accessed from the browser
through a thin, typed data-access layer (one module per domain under `app/lib/`). Route modules
MUST NOT call service SDKs directly; the data-access module is the single seam. Corpus files
MUST NEVER be stored in the database, and this app MUST NOT mutate corpus files it does not own.

**Rationale**: A static SPA deploys anywhere the CI pipeline points it, and a single data seam
keeps the pending `corpora-auth` integration a one-module change instead of a rewrite.

### III. Tested at the Seams

Every route module and every data-access function MUST have Vitest coverage. Route modules are
tested with `createRoutesStub` and Testing Library; data-access functions are tested with the
service client mocked at the module boundary. CI tests MUST NOT depend on live network services.
`bun run typecheck`, `bun run lint`, `bun run test`, and `bun run build` MUST all pass before
any PR merges (enforced by the `check` job, which runs `make ci`).

**Rationale**: Mocking at the same seams the architecture defines (Principle II) keeps tests
fast, deterministic, and honest about the contract each layer owns.

### IV. Data Integrity & Forward-Compatible Schema

Integrity rules live in the database, not only in the UI: required fields use constraints,
associations use foreign keys with explicit `on delete` behavior, and uniqueness is enforced by
keys — the UI mirrors these rules but MUST NOT be their only enforcement. Row-Level Security
MUST be enabled on every table from creation, even while policies are temporarily permissive
(pre-auth anonymous posture). Schema changes MUST be forward-compatible where feasible —
additive columns over renames, nullable ownership columns reserved ahead of the auth cutover.
Destructive user actions MUST require explicit confirmation, and failed writes MUST surface a
visible error, never silent loss.

**Rationale**: The shared-pool anonymous phase is temporary; a schema and RLS posture designed
for the auth cutover makes that transition a policy swap instead of a migration event.

### V. Branch & Release Discipline

Work happens on `<type>/<slug>` branches targeting the single open `release/vX.Y.Z` branch,
which in turn is the only thing that may target `main`. PR titles MUST follow Conventional
Commits — the `guard` job rejects a PR whose title or branch name does not. Direct pushes to
`main` are prohibited; the full policy in `.github/WORKFLOW.md` is authoritative where more
specific.

**Rationale**: Release automation (preview deploys, semver tags, production deploys) is computed
from branch flow and commit convention; breaking either silently breaks shipping.

## Additional Constraints

- **Stack**: TypeScript, React 19, React Router v8 framework mode (SPA), Bun as package
  manager/runner, Tailwind CSS v4 with vendored coss ui components (`app/components/ui/`),
  Vitest + Testing Library, oxlint. Introducing a new runtime dependency MUST be justified in
  the feature's plan.
- **Configuration**: Environment values are supplied via Vite `VITE_*` variables and documented
  in `.env.example`; secrets MUST NOT be committed. Only publishable/anon service keys may ship
  to the browser.
- **Vendored UI**: Components under `app/components/ui/` follow coss ui conventions; feature
  components live outside it (e.g., `app/components/<feature>/`) and compose the vendored set.

## Development Workflow & Quality Gates

- Feature specs, plans, and tasks live under `specs/<NNN-short-name>/` on a matching numbered
  branch created by the Spec Kit scripts.
- The plan's Constitution Check MUST evaluate the feature against these principles before
  Phase 0 research and again after Phase 1 design; unjustified violations block progression,
  and justified ones MUST be recorded in the plan's Complexity Tracking table.
- Code review verifies compliance with this constitution in addition to correctness; reviewers
  MUST flag untested route/data modules (Principle III) and UI-only integrity rules
  (Principle IV).
- Spec Kit artifacts SHOULD be committed at each pipeline step (the git extension's optional
  hooks) so spec history mirrors decision history.

## Governance

This constitution supersedes ad-hoc practice for corpora-web. Amendments are made by editing
`.specify/memory/constitution.md` via `/speckit-constitution` (or an equivalent reviewed PR),
MUST include a Sync Impact Report, and MUST propagate changes to dependent templates and
guidance docs in the same change. Versioning follows semantic rules: MAJOR for removed or
redefined principles, MINOR for new or materially expanded principles/sections, PATCH for
clarifications. Every feature plan's Constitution Check is the recurring compliance review;
disputes are resolved in PR review against the text of this document.

**Version**: 1.0.0 | **Ratified**: 2026-07-19 | **Last Amended**: 2026-07-19

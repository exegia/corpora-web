<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/002-project-detail/plan.md`
<!-- SPECKIT END -->

# corpora-web

React Router 7 SPA (client-side only — every route uses `clientLoader` /
`clientAction`), Vite, Tailwind v4, Base UI via `@exegia/corpora-ui`, Supabase.
Package manager is **bun**.

```bash
bun run dev         # never run this yourself — use the preview/launch tooling
bun run typecheck   # react-router typegen && tsc
bun run test        # vitest, 230 tests
bun run lint        # oxlint
```

`bun run lint` reports ~35 pre-existing `only-export-components` warnings — every
route module exports loaders/actions alongside its component. Those are expected;
don't "fix" them.

Protected routes (`/project`, `/corpus`, `/profile`) redirect to login in the
browser preview — reaching them needs a hand-seeded session token. For a change
you can't preview, the route tests in `app/routes/*.test.tsx` render the real
components and are the better evidence anyway.

## The UI library is a separate repo

Components come from `@exegia/corpora-ui`, whose source is the sibling checkout
`../corpora-ui/react`. Local `app/components/ui/*` files are mostly thin
re-exports of that package. **Before restyling or forking one of them**, check
whether the change belongs upstream — see [docs/corpora-ui.md](docs/corpora-ui.md)
and the `extract-component` skill.

## Component folders follow a fixed layout

A folder under `app/components/*` is one section of UI. Inside it: one
default-exported component per file, `types.ts` for props shared across the
folder, `utils.ts` for helpers and type guards, and an `index.ts` barrel that
exports a namespace object (`export const Corpus = { List, Section }`), so
callers read `<Corpus.Section />`. `app/components/project` is the reference.
To reorganize a folder into this shape, use the `refactor-structure` skill and
the `folder-refactorer` agent.

## Conventions worth reading before you edit

| Topic | File |
| --- | --- |
| Layout traps in the shared `Button`, clickable card rows, destructive confirms | [docs/ui-patterns.md](docs/ui-patterns.md) |
| Deferred loaders, Suspense skeletons, and the `loaderData` contract | [docs/data-loading.md](docs/data-loading.md) |
| View transitions and reduced motion | [docs/motion.md](docs/motion.md) |
| Test gotchas specific to this app | [docs/testing.md](docs/testing.md) |
| Working with the upstream component library | [docs/corpora-ui.md](docs/corpora-ui.md) |
| Auth screens, route guards, and the not-yet-wired Supabase seam | [docs/auth.md](docs/auth.md) |

## Two invariants that will bite

1. **`loaderData` is a public contract.** `app/components/breadcrumb` reads
   `project` / `licence` off it via `useMatches`. Reshaping a detail loader
   silently degrades the breadcrumb — nothing type-errors. See
   [docs/data-loading.md](docs/data-loading.md).
2. **A duplicate `view-transition-name` aborts the whole transition** — silently,
   with no console error. See [docs/motion.md](docs/motion.md).

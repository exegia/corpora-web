---
name: "extract-component"
description: "Extract a component from corpora-web into the corpora-ui library repo so it can be published to npm and consumed back from @exegia/corpora-ui. Use when asked to extract, promote, move, or upstream a component (by name or from a selection), to make a local component reusable across the corpora apps, or to publish something to the shared UI package."
argument-hint: "Component name, file path, or selection to extract"
user-invocable: true
disable-model-invocation: false
---

# Extract a component to `@exegia/corpora-ui`

Moves a component from this app into the sibling library repo, through its
release flow, and back into this app as a package import.

Target repo: `../corpora-ui`, library in `../corpora-ui/react`. Authority for
layout is `react/ARCHITECTURE.md`; conventions are in `react/CLAUDE.md`; the
branch/release flow is `.github/WORKFLOW.md`. **Read those before step 1** —
they are the source of truth and this skill only summarises them.

## Step 0 — decide whether it should move at all

Answer these before touching anything; report the answer to the user.

**Stays in corpora-web** if it is app-specific composition — it imports
`react-router` fetchers/loaders, `@/lib/*` domain modules, Supabase, or app
route intents. `ConfirmDeleteDialog` submits an app intent through `useFetcher`,
so it stays.

**Goes upstream** if it is generic and reusable across corpora apps, with no app
imports beyond what the library already depends on.

**Split** if it is a generic shell wrapped around app wiring: upstream the
presentational shell, keep a thin app-side component that supplies the data. This
is the common outcome — prefer it over moving something that then needs app
imports added to the library.

Pick the category from `ARCHITECTURE.md`:

| Category | Directory | What it is |
| --- | --- | --- |
| `atoms` | `react/src/components/ui/` | primitives (button, input) |
| `components` | `react/src/components/composed/` | purposeful, unopinionated compositions |
| `blocks` | `react/src/components/blocks/` | opinionated single-purpose assemblies |

## Step 1 — port the source

1. Create `react/src/components/<dir>/<name>.tsx`.
2. Rewrite imports to library-local paths (`@/components/ui/*`, `@/lib/utils`).
   Any remaining app import means you picked the wrong split — go back to step 0.
3. Match library conventions:
   - `cn()` from `@/lib/utils`, `cva` for variants.
   - Accessibility and explicit `type` on buttons/inputs.
   - If it makes a noise, follow the cuelume rules in `react/CLAUDE.md`: emit
     inert `data-cuelume-*` attributes, take `sound?: boolean` (default true),
     and never call `bind()` at module scope.
   - If it needs a glass variant, follow `ui/button.tsx` exactly — glass is a
     `variant`, never a separate `Glass<X>` component.
4. Install any new dependency **in `react/`**, never at the repo root:
   `cd /absolute/path/to/corpora-ui/react && bun add <pkg>`.

## Step 2 — export and document

The docs site is registry-driven; a component with no registry entry is
invisible. All four steps are required:

1. Export from `react/src/index.ts` (this is the npm surface).
2. Add a demo at `react/src/registry/demos/<slug>-demo.tsx`.
3. Add an entry to `react/src/registry/{atoms,components,blocks}.ts` with
   `slug`, `name`, `description`, `category`, `status`, `preview`
   (`React.lazy(() => import("./demos/<slug>-demo"))`), `props`, `usage`, and
   `registryDependencies`. See `react/src/registry/schema.ts` for the shape.
4. `status` is `planned` | `in-progress` | `stable` — omit `preview` while
   `planned`.

That single entry produces the homepage tile, sidebar link, category card and
detail page.

## Step 3 — verify in the library repo

```bash
cd /absolute/path/to/corpora-ui && make check && make test
```

`make check` runs `tsc -b --noEmit` + eslint. Plain `tsc --noEmit` checks nothing
there — the root tsconfig is references-only. Use `make serve` to see the demo.

## Step 4 — branch, PR, release

Per `.github/WORKFLOW.md`:

```
feat/<slug> ──PR──> release/vX.Y.Z ──PR──> main ──> npm + tag
```

- Branch `feat/<slug>` off the **open release branch**, not `main`.
- Conventional-commit form goes in the **PR title** (`feat: add tooltip`) — git
  forbids `:` in a ref name.
- PR targets the release branch. Draft runs only the guard; marking it ready
  starts tests and AI review.
- Merging into `main` publishes to npm with provenance, tags, and cuts the next
  release branch. `make publish` skips a version already public.
- Release branches must carry their version in `react/package.json` — the guard
  rejects a mismatch. `make version-set VERSION=x.y.z`.

Anything CI does is a `make` target, so it reproduces locally. **Do not push or
open PRs without asking** — confirm with the user first.

## Step 5 — consume it back in corpora-web

1. `bun add @exegia/corpora-ui@<version>` (needs a `read:packages` GitHub token
   in `.npmrc`).
2. Replace the local component with a re-export, matching the house style:
   ```tsx
   // app/components/ui/<name>.tsx
   export { Thing, type ThingProps } from "@exegia/corpora-ui";
   ```
   Keep a wrapper only to set an app-wide default — see `ui/button.tsx`, which
   defaults cuelume `sound` on.
3. Delete the old implementation; leave call-site imports (`@/components/ui/...`)
   unchanged so the diff stays small.
4. Add any new `@base-ui/react/*` subpaths to `optimizeDeps.include` in
   `vite.config.ts`, or dev hits **504 Outdated Optimize Dep**. Then
   `rm -rf node_modules/.vite` and restart the dev server.
5. `bun run typecheck && bun run test`, and check the component in the browser in
   light and dark.

## Report back

State: what moved and what stayed (with the reason if you split), the category
chosen, the registry entry added, verification results in both repos, and the
publish state — nothing pushed unless the user approved it.

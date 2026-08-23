# AGENTS.md

## Stack
- React Router 8 framework mode, **SPA** (`ssr: false` in `react-router.config.ts`) — every route uses `clientLoader`/`clientAction`, no server. Static output in `build/client/`.
- Vite + Tailwind v4 (`@tailwindcss/vite`) + Base UI via `@exegia/corpora-ui` (sibling checkout `../corpora-ui/react`, vendored re-exports in `app/components/ui/`).
- Supabase (`@supabase/supabase-js` + `@exegia/use-auth` / `@exegia/plugin-supabase-auth`). Bun is the package manager. Node 24 in CI (`.github/actions/setup`).

## Commands — use `bun`, not npm
```bash
bun install                          # CI uses --frozen-lockfile (via make ci)
bun run dev                          # dotenvx run -- react-router dev (don't run in agent; use preview harness)
bun run typecheck                    # dotenvx run -- react-router typegen && tsc — generates .react-router/types/
bun run lint                         # oxlint — ~35 only-export-components warnings on route modules are expected
bun run test                         # vitest run (single run); watch: bun run test:watch
make ci                              # what CI runs: install + typecheck + lint + test + build
make pr-guard BASE=... HEAD=... TITLE=...  # validate PR guard locally
```
- Single test: `bunx vitest run app/routes/project.test.tsx` or `bunx vitest run -t "test name"`.
- Path alias `@` → `app/` (`tsconfig.json` + `vite.config.ts`).
- `react-router typegen` must run before `tsc` — `bun run typecheck` does both. Generated types in `.react-router/`.

## Env & build gotchas
- Client-only SPA: `VITE_*` vars are **inlined into public JS at build time**. Never put secrets behind `VITE_`.
- Local `.env` is **encrypted with dotenvx** (key in `.env.keys`, never committed). Scripts use `dotenvx run`. Vercel's `vercel.json` buildCommand is `react-router build` (no dotenvx) — Vercel env vars are the only source there.
- `vercel.json` pins `framework: null`, `outputDirectory: build/client`, rewrites `/(.*)` → `/index.html` for SPA deep links, immutable cache on `/assets/*`.
- `vite.config.ts:optimizeDeps.include` must list every `@base-ui/react/*` subpath and bare import used transitively — otherwise Vite lazy re-optimizes and in-flight requests 504. After bumping `@exegia/corpora-ui`, add new subpaths there.
- `vite.config.ts:server.fs.allow` includes resolved `node_modules` — required for git worktrees (otherwise `vite dev` serves blank).
- `.npmrc` pins `@exegia:registry=https://registry.npmjs.org/` — don't switch to `npm.pkg.github.com` or `bun.lock` bakes authed URLs that 401 in CI/Vercel. Verify with `HOME=/tmp/empty bun install --frozen-lockfile`.

## Architecture — what filenames don't tell you
- Routes defined in `app/routes.ts` — `app/root.tsx` is the HTML shell + sidebar layout (`app/components/app-layout.tsx`). Auth routes use `routes/auth-layout.tsx` (no sidebar); protected routes use `routes/protected-layout.tsx` (`requireSession` guard runs before child loaders).
- Route modules import only from `app/lib/*`, never `supabase-js` directly.
- **`loaderData` is a public contract** (`docs/data-loading.md`): `app/components/breadcrumb` reads `project`/`licence` via `useMatches` with runtime type guards — reshaping a detail loader silently degrades the breadcrumb (no type error). Await the primary record in detail loaders; defer only expensive follow-ups. Check with `grep -rn 'useMatches\|useRouteLoaderData\|loaderData' app | grep -v '\.test\.'`.
- **Deferred loaders + Suspense** (`docs/data-loading.md`): data-bearing loaders return *un-awaited* promises; components suspend on `<Await>` with a skeleton fallback. Skeletons carry `role="status"`/`aria-label="Loading …"`, mirror loaded layout, call `useLoadingSound()`; loaded component calls `useReadySound()`. Revalidation hands `<Await>` a new promise but keeps resolved UI mounted — relied on by `set-status`/`link-corpus`/etc.; pinned by test *"does not flash the skeleton back in when an action revalidates"* in `app/routes/project.test.tsx` — don't delete it.
- **Duplicate `view-transition-name` aborts the whole transition silently** (`docs/motion.md`). Also: don't put a shared-element morph target behind a Suspense boundary — `project/:projectId` header renders outside it for that reason.
- Component folders under `app/components/*` follow `types.ts` / `utils.ts` / `index.ts` (namespace barrel `export const Foo = { Bar, Baz }`) — `app/components/project` is the reference. Use `refactor-structure` skill to reorganize.
- `app/components/ui/*` are thin re-exports of `@exegia/corpora-ui` — check `node_modules/@exegia/corpora-ui/src/...` or `../corpora-ui/react/src/...` before restyling; if change is generic, it belongs upstream (`extract-component` skill, `docs/corpora-ui.md`). `button.tsx` wraps with `sound` default; `Input`'s `className` lands on the wrapper, not inner `<input>` (`docs/ui-patterns.md`).
- corpora-py conversion service is **poll-only** (polling advances the job) — see `specs/004-connect-with-py/contracts/corpora-api.md`.

## Testing (`docs/testing.md`, `vitest.config` in `vite.config.ts`)
- `app/**/*.test.{ts,tsx}`, jsdom, `setupFiles: app/test/setup.ts` (stubs `ResizeObserver`, `Element.prototype.getAnimations`, `matchMedia` — without these every layout route crashes).
- Route tests use `createRoutesStub` — must pass `HydrateFallback: () => null` for any route with `clientLoader`, and cast `loader`/`action` as `never`.
- Deferred content needs `findBy*` not `getBy*`. Don't use a heading as a load proxy — `project/:projectId` header resolves before panels. Skeletons are `role="status"` so bare `getByRole("status")` is ambiguous — query by text then assert role.
- Open Base UI dialog marks rest of app `aria-hidden` — background content invisible to `getByRole`/`getByText`; use `document.body.textContent` instead.
- Deletes require typing `DELETE` to enable confirm button.

## Branch, PR & release (`README.md`, `.github/WORKFLOW.md`, `Makefile`)
- Exactly one `release/vX.Y.Z` branch open; `package.json` version must match it. Flow: `<type>/<slug>` → PR → `release/vX.Y.Z` → PR → `main` → Vercel prod + tag + next release branch.
- Feature branch name: `<type>/<slug>` where type is `feat|fix|chore|docs|ci|refactor|test|perf|build|style|revert` (lowercase). PR **title** must be `<type>: summary` (optionally `(scope)` and `!`) — **no leading emoji** even though commit subjects use `✨ feat: …`. Guard matches from first char. Retitling a red PR does not re-run guard (workflow triggers `opened/reopened/ready_for_review/synchronize`, not `edited`) — close and reopen to re-evaluate.
- Draft PRs only run `guard`; marking ready runs `check` (typecheck+lint+test+build) and AI review. `release/*` PRs also run `package` (uploads `build/client`) and always get a rolling Vercel preview.
- Reproduce CI locally: `make ci`. Other targets: `make help`, `make next-version BUMP=minor|patch|major`, `make release-notes`.

## Source of truth
Executable config wins over prose. Canonical docs: `CLAUDE.md` (and linked `docs/ui-patterns.md`, `docs/data-loading.md`, `docs/motion.md`, `docs/testing.md`, `docs/corpora-ui.md`, `docs/auth.md`), `specs/004-connect-with-py/plan.md` + contracts, `.github/WORKFLOW.md`, `Makefile`, `vite.config.ts`.

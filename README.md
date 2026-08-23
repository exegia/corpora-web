# corpora-web

Web companion app for Corpora.

## Stack

- **React 19** + **TypeScript**
- **React Router v8 — framework mode, SPA** (`ssr: false`): file-based route modules, typegen, loaders/actions available via `clientLoader`/`clientAction`, static output deployable anywhere
- **Bun** — package manager & script runner
- **Tailwind CSS v4** + **coss ui** (shadcn-style components in `app/components/ui`, Base UI primitives)
- **Vitest** + Testing Library (jsdom, `createRoutesStub`)
- **oxlint** for linting

## Getting started

```bash
bun install
bun run dev
```

## Scripts

| Command | Description |
| --- | --- |
| `bun run dev` | Dev server (`react-router dev`) |
| `bun run build` | Production SPA build → `build/client/` |
| `bun run preview` | Preview the production build |
| `bun run typecheck` | Route typegen + `tsc` |
| `bun run test` | Run tests once |
| `bun run test:watch` | Run tests in watch mode |
| `bun run lint` | Lint with oxlint |

## Structure

| Path | Purpose |
| --- | --- |
| `app/root.tsx` | HTML shell, error boundary, wraps everything in the sidebar layout |
| `app/routes.ts` | Route config |
| `app/routes/*.tsx` | Route modules: `/` (dashboard), `/references`, `/library`, `/project`, `/corpus` |
| `app/components/app-layout.tsx` | coss ui sidebar + header shell (renders `<Outlet />`) |
| `app/components/ui/` | Vendored coss ui components |
| `react-router.config.ts` | `ssr: false` (SPA mode) |

Route types are generated into `.react-router/` by `react-router typegen` (runs automatically in dev and `typecheck`).

## Branching, CI, and releases

Same deployment-not-package split as [corpora-ui](https://github.com/exegia/corpora-ui):
this app is private and `main` deploys to Vercel production. Full details:
[`.github/WORKFLOW.md`](.github/WORKFLOW.md).

```
feat/add-tooltip ──PR──> dev ──(daily/manual)──> next ──cut──> release/vX.Y.Z ──PR──> main
                    (deleted on merge)         (preview)                    (prod + tag)
```

| Flow | What happens |
| --- | --- |
| `<type>/<slug>` → PR to `dev` | `guard` (branch name + conventional-commit PR title), `check` (typecheck, lint, test, build), and an AI review once the PR is ready for review |
| **Promote to next** (22:00 UTC or manual) | Opens `dev` → `next` with a version from line-count churn (`< 100` patch, `100–999` minor, `≥ 1000` major) and auto-merges after CI |
| Push to `next` | Rolling Vercel preview; cuts or refreshes `release/vX.Y.Z`; the draft PR into `main` is opened or updated |
| `release/vX.Y.Z` → PR to `main` | `guard` also asserts `package.json` matches the branch version; `package` uploads the production build as an artifact |
| Release PR merged | Deploys to Vercel production, tags `vX.Y.Z`, publishes a GitHub Release, syncs `main` back into `next` and `dev`, deletes leftover branches |

Exactly one release branch is in flight at a time. `main` takes PRs only from
`release/vX.Y.Z`; the ruleset requires the `guard`, `check` and `package`
checks. `dev` and `next` require `guard` and `check`.

Every CI step is a `make` target, so anything CI does can be reproduced
locally — `make ci` is what runs on a PR. `make help` lists the rest.

### One-time setup

```bash
gh auth login                          # if needed
bunx vercel link                       # creates .vercel/project.json
make rulesets-apply                    # push .github/rulesets/*.json
```

Then add the secrets listed in [`.github/WORKFLOW.md`](.github/WORKFLOW.md) —
`VERCEL_TOKEN` on the `preview` and `production` environments, and the
automation App credentials on the repository. Enable **Allow auto-merge**.
There are no `dev` / `next` lanes on a fresh repo: run **Actions → Release →
Run workflow** once (or `make bootstrap-lanes`) to create them, then
**Promote to next** when `dev` has work.

## Deployment (Vercel)

`vercel.json` pins the deploy so it does not depend on framework auto-detection:

| Setting | Value | Why |
| --- | --- | --- |
| `framework` | `null` | Deploy as a plain static site; there is no server (`ssr: false`) |
| `buildCommand` | `react-router build` | Bypasses `dotenvx` so Vercel's own env vars are the only source |
| `outputDirectory` | `build/client` | Where SPA mode emits `index.html` + `assets/` |
| `rewrites` | `/(.*)` → `/index.html` | Deep links (`/licenses/:id`, `/project/:id`) must not 404 on refresh |
| `headers` | immutable cache on `/assets/*` | Filenames are content-hashed |

Unmatched paths fall through to the app's own 404 boundary rather than a hosting error.

### Environment variables

This is a **client-only SPA**: every `VITE_*` variable that the code references is
**inlined into public JavaScript** at build time. Anyone can read it in the bundle.

- **Never** set a secret (service-role/secret key, GitHub token, OpenAI key) as a `VITE_*`
  variable — there is no server to hold it.
- They are **build-time**, not runtime: set them for the Build step and **redeploy**
  after any change.
- Values set in the Vercel dashboard take precedence over any local `.env`.

Set these in Vercel → Project → Settings → Environment Variables (Production + Preview):

| Variable | Required | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | yes | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | yes | Publishable/anon key — browser-safe, protected by RLS |
| `VITE_SUPERADMIN_EMAIL` | optional | Overrides the hard-coded superadmin fallback |

Nothing else is read by the app. The site browses anonymously, so every page depends on
Supabase RLS permitting the `anon` role.

Locally, `.env` is committed **encrypted by dotenvx** and decrypted at run time with the
private key in `.env.keys` (never committed). Vercel does not get that key — the
`react-router build` command in `vercel.json` skips dotenvx entirely, so Vercel's own
environment variables are the only source there. Keep `.env` encrypted before committing
(`bunx dotenvx encrypt`) if you ever run `bunx dotenvx decrypt` to read it.

## Adding coss ui components

Components are vendored (copy-paste model). To add or update one:

```bash
bunx shadcn@latest add @coss/<component>
```

The `@coss` registry is configured in `components.json`. Import via aliases: `@/components/ui/*`, `@/lib/utils`, `@/hooks/*` (`@` → `app/`).

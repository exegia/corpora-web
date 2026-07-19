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

## Adding coss ui components

Components are vendored (copy-paste model). To add or update one:

```bash
bunx shadcn@latest add @coss/<component>
```

The `@coss` registry is configured in `components.json`. Import via aliases: `@/components/ui/*`, `@/lib/utils`, `@/hooks/*` (`@` → `app/`).

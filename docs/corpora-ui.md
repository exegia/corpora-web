# Working with `@exegia/corpora-ui`

Most of `app/components/ui/*` is a thin re-export of the published package:

```tsx
// app/components/ui/input.tsx
export { Input, InputPrimitive, type InputProps } from "@exegia/corpora-ui";
```

Some files wrap it to set an app-wide default — `button.tsx` turns cuelume
`sound` on for every button so call sites don't repeat it.

## Where the source actually lives

Sibling checkout: `../corpora-ui`, with the library in `../corpora-ui/react`.

| | |
| --- | --- |
| npm package | `@exegia/corpora-ui` |
| library entry | `react/src/index.ts` |
| components | `react/src/components/{ui,composed,blocks}` |
| docs registry | `react/src/registry/` |
| architecture | `react/ARCHITECTURE.md` |
| conventions | `react/CLAUDE.md` |
| branch/release flow | `.github/WORKFLOW.md` |

Note `ARCHITECTURE.md` writes paths as `src/…` and the package as `@corpora/ui`;
both are relative to `react/`, and the published name is `@exegia/corpora-ui`.

Dependencies install in `react/`, never at the repo root — the root has no
`package.json` on purpose.

## Reading upstream source when a component misbehaves

The published package ships its sources, so you can read the real implementation
without leaving this repo:

```bash
cat node_modules/@exegia/corpora-ui/src/components/ui/input.tsx
```

That is how the `Button` hidden-span trap and the `Input` wrapper/`aria-invalid`
styling in [ui-patterns.md](ui-patterns.md) were found. Do this before assuming a
component's `className` lands where you expect — on `Input` it goes to the
wrapper, not the inner `<input>`.

## Deciding local vs upstream

Keep it local when it is app-specific composition: it wires app routes, fetchers,
loaders, or domain vocabulary. `ConfirmDeleteDialog` submits an app intent via
`useFetcher`, so it stays here.

Move it upstream when it is generic and reusable across the corpora apps, with no
app imports (`@/lib/*`, `react-router`, Supabase) other than what the library
already depends on.

To move one, use the **`extract-component`** skill — it covers the split, the
registry entry, the release/publish flow, and swapping this repo over to the
published version.

## Which registry

The library publishes to **both** public npm and GitHub Packages. This app pulls
from **public npm**, pinned by the committed `.npmrc`:

```
@exegia:registry=https://registry.npmjs.org/
```

Don't remove that line, and don't switch the scope to `npm.pkg.github.com`. If a
contributor's `~/.npmrc` maps `@exegia` to GitHub Packages, their local install
bakes authenticated `npm.pkg.github.com` URLs into `bun.lock`, and then every
environment without a `read:packages` token — GitHub Actions, Vercel — fails the
install with a 401. The project-level `.npmrc` overrides that. No token is
needed for any of it, and none belongs in that file.

To check an install the way CI sees it, hide the user-level config:

```bash
HOME=/tmp/empty bun install --frozen-lockfile
```

## Version bumps

After a component is published, update here with
`bun add @exegia/corpora-ui@<version>`, then add any new `@base-ui/react/*`
subpaths to `optimizeDeps.include` in `vite.config.ts` (see
[motion.md](motion.md) for why).

Keep `bun.lock` committed and in sync — CI installs with `--frozen-lockfile`, so
bumping a range in `package.json` without re-resolving fails the build before
anything compiles.

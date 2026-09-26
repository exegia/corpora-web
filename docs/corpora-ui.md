# Working with `@exegia/corpora-ui`

All 54 modules in `app/components/ui/*` use focused public entries from the
published package:

```tsx
// app/components/ui/input.tsx
export { Input, InputPrimitive, type InputProps } from "@exegia/corpora-ui/ui/input";
```

Some files wrap it to set an app-wide default — `button.tsx` turns cuelume
`sound` on for every button so call sites don't repeat it.

## Where the source actually lives

Sibling checkout: `../corpora-ui`, with the library in `../corpora-ui/react`.

| | |
| --- | --- |
| npm package | `@exegia/corpora-ui` |
| library entry | `react/src/index.ts` |
| focused UI entries | `react/src/ui/` |
| components | `react/src/components/{ui,composed,blocks}` |
| documentation and examples | `react/content/`, `react/src/components/stories/` |
| architecture | `react/ARCHITECTURE.md` |
| conventions | `react/CLAUDE.md` |
| branch/release flow | `.github/WORKFLOW.md` |

Library paths such as `src/…` are relative to `react/`.

Dependencies install in `react/`, never at the repo root — the root has no
`package.json` on purpose.

## Reading upstream source when a component misbehaves

The published package contains compiled JavaScript, declarations, and CSS in
`dist-lib/`. Read component source in the sibling checkout:

```bash
cat ../corpora-ui/react/src/components/ui/input.tsx
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

To move one, use the **`extract-component`** skill — it covers the split,
public exports and documentation, the release/publish flow, and swapping this repo over to the
published version.

The primitive sidebar lives upstream in `components/blocks/sidebar-primitives`.
Its instance-keyed Jotai state shares the library provider's store. Keep route,
authentication, and domain wiring in the app's layout components.

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
`bun add @exegia/corpora-ui@<version>`. Vite scans app imports and pre-bundles
Base UI subpaths automatically (see [motion.md](motion.md)).

Keep `bun.lock` committed and in sync — CI installs with `--frozen-lockfile`, so
bumping a range in `package.json` without re-resolving fails the build before
anything compiles.

## Upgrading from 0.28 to 2.0

The 2.0 upgrade aligned the app with the library's Jotai 3.0.0 peer and Base UI
1.8.0. Keep the app's Base UI version aligned with the library so composed controls
share one set of contexts.

The 2.x package renamed public types, including `TButtonProps`, `TInputProps`,
`TAuthAccent`, `IFileIconProps`, `IShellPanelControls`, `ITreeNode`, and
`TProfileCardItem`. App adapters alias these to their existing local names.
Social-provider and linked-identity types are no longer exported at the package
root; `app/components/auth/types.ts` derives them from public component contracts.
Do not import private package paths to recover those types.

`useUISounds()` calls the library's `bindSounds()` after applying the saved mute
preference. Binding cuelume directly handles delegated pointer events but leaves
the library's imperative keyboard cues disabled.

The OTP block now includes a "Verification code" label alongside its title.
Tests waiting for the screen should match the exact "Enter verification code"
title to avoid an ambiguous text query. Vite discovers the runtime imports through
dependency scanning and the configured Base UI subpath glob.

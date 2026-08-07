---
name: "refactor-structure"
description: "Reorganize a folder into the app's file/folder convention: one section per folder, one default-exported component per file, types.ts / utils.ts / index.ts barrels — with flat export * barrels instead for app/lib and other non-UI module folders. Use when asked to reorganize, restructure, split up, or clean up the files and folders under a directory, to break a large component or module file into smaller ones, or to make a folder follow the same layout as an existing one."
argument-hint: "Folder to reorganize, e.g. app/components/project"
user-invocable: true
disable-model-invocation: false
---

# Reorganize a folder into the file/folder convention

Moves code between files. **It must not change behaviour.** The reference
implementation is `app/components/project` — read it if the rules below are
ambiguous.

For a tree with several sections, delegate one folder per `folder-refactorer`
agent (`.claude/agents/folder-refactorer.md`) rather than doing it all inline.

## Components vs. modules — two of these rules only apply to UI

Everything below is written for `app/components`. When the target is `app/lib`
or another module folder, keep the file-size and grouping rules but **invert
two**:

- **Barrels stay flat** — `export * from "./queries"`, never a namespace object.
  `Projects.list()` across two dozen consumers is churn, and it defeats
  tree-shaking on the data layer.
- **Many named exports per file is correct.** "One default export" tames
  components; data modules export functions and types by design.

Done right this is *better* than the component case: a flat barrel keeps
`@/lib/projects` resolving to the same symbols, so **no consumer changes at
all**. Prove it — diff the exported symbol list before and after:

```bash
git show HEAD:app/lib/<mod>.ts | grep -oE '^export (async function|function|class|const|interface|type) [A-Za-z_]+' | awk '{print $NF}' | sort > /tmp/before.txt
```

Two extra traps in `app/lib`: colocated `*.test.ts` files stay put (the barrel
keeps their import path valid — moving them only risks the mock paths), and
`vi.mock("@/lib/<mod>")` factories that enumerate exports rather than spreading
`importOriginal` will not be caught by typecheck. Grep for them and run those
suites specifically.

## The convention

A folder is one section or chunk of UI — a card, a panel, a dialog and the form
nested inside it. Inside it:

| File | Holds |
| --- | --- |
| `<component>.tsx` | one component, `export default`, no second export |
| `types.ts` | the folder's prop interfaces and shared types |
| `utils.ts` | helpers, type guards, pure functions |
| `index.ts` | the barrel |

Barrels are namespace objects, so callers read `<Corpus.Section />`:

```ts
import { default as List } from "./list"
import { default as Section } from "./section"

export const Corpus = { List, Section }
```

Export only the members consumers use. Rows, sheets and labels that exist to
serve one component stay internal — the parent imports them by path.

Rules that decide the hard cases:

- **`types.ts` earns its place.** It exists only if more than one file in the
  folder imports from it. A one-interface file is churn; leave that interface in
  its component.
- **Type guards and helpers go in `utils.ts`**, never `types.ts` — `isAgreed` is
  a function, so it cannot live beside the type it narrows to.
- **A helper that contains JSX is `.tsx`.** Don't reach for `createElement` to
  keep a file `.ts`.
- **Names are short and positional**: `section.tsx`, `list.tsx`, `list-row.tsx`,
  `catalog-sheet.tsx`. The folder already supplies the noun — `corpus/section.tsx`,
  not `corpus/corpus-section.tsx`.
- Anything shared across *sibling* folders goes in the parent's `types.ts`
  (e.g. `project/types.ts` holds the `ActionResult` every fetcher returns).

## Step 0 — capture the baseline, even if it is broken

Before editing anything:

```bash
bun run typecheck 2>&1 | tail -20
bun run test 2>&1 | tail -8
```

Write both numbers down. A half-finished reorg on the branch may already be
failing — that is normal and it is the acceptance test. You report the **delta**,
never the absolute, or "230/230 passing" will read as "no regressions" when it
was really "fixed the 30 that were broken."

Then find every consumer, inside and outside the folder:

```bash
grep -rn "components/<folder>" app --include="*.ts" --include="*.tsx"
```

## Step 1 — split, one folder at a time

Read the whole folder first, then write the new files. For each large file, pull
out every nested component that has its own props: rows out of lists, sheets out
of sections, fields out of panels, checklists out of cards. Copy the bodies
**verbatim** — including comments, `aria-label`s, and the exact class strings.
A reworded comment is fine; a dropped `disabled` is a bug typecheck won't catch.

Delete the superseded files with `git mv` for straight renames and `git rm` only
for files with no successor, so the index stays coherent.

Run `bun run typecheck` after each folder. Do not start the next one until it is
clean.

## Step 2 — update consumers

**Import lines and JSX element names only.** Loader shape, prop spreading, and
the objects passed into the moved components stay byte-identical. In this app
`app/components/breadcrumb` reads `project` / `licence` off `loaderData` via
`useMatches` and nothing type-errors when that breaks — the refactor stops at the
module boundary. If a change seems to need more than an import and a tag name,
the new structure is wrong; go back to step 1.

Blind string replacement over-matches. `<Panel` → `<Detail.Panel` also rewrites
`<PanelsSkeleton`. Include the trailing space or `>` in the pattern, then grep
the file for both the old and the new identifiers and read the hits.

## Step 3 — do not write tests

If the folder has no test files, it gains none. A convention that lists
`[name].test.tsx` describes what a folder *may* contain, not a template every
folder must fill — and this repo tests at the route and lib level, not the
component level. Say in the report that you left it alone deliberately.

## Step 4 — verify and report

```bash
bun run typecheck && bun run test && bun run lint && bun run build
```

`bun run lint` carries ~25–35 pre-existing `only-export-components` warnings on
route modules. Confirm none of them point at the refactored folder; don't try to
drive the total to zero.

Report a table of before → after for typecheck errors, test counts, lint
warnings, and build. Then state plainly:

- what the baseline already was, if it was broken
- any file that intentionally breaks "one default export" and why (helper
  modules like `status-actions.tsx` legitimately export two functions)
- anything you left staged rather than committed — committing is the user's call

If browser verification is blocked (an auth guard, a route you can't reach), say
so and name what covers the render path instead. Route tests that render the
moved components are better evidence for a file move than a screenshot.

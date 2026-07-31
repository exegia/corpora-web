---
name: "improve-ui-design"
description: "Improve the visual design and perceived performance of a corpora-web screen — list/card rows, loading skeletons, and page-navigation transitions. Use when asked to make a page look better, polish a row or card, add or fix a loading skeleton, make navigation feel smoother, or when handed a screenshot annotation pointing at a layout or styling problem."
argument-hint: "Optional: the route, component, or screenshot area to improve"
user-invocable: true
disable-model-invocation: false
---

# Improve UI design

Three related jobs, usually requested together as "make this nicer": **row/card
layout**, **loading skeletons**, and **navigation transitions**. Each has a
worked reference in this repo and a set of traps that cost real debugging time.

Read [docs/ui-patterns.md](../../../docs/ui-patterns.md),
[docs/data-loading.md](../../../docs/data-loading.md) and
[docs/motion.md](../../../docs/motion.md) before editing — they hold the details
this skill only summarises.

## Before you style anything: find the real cause

Apparent styling bugs here are often structural. Check these first, in order:

1. **Is the container a `Button` from `@exegia/corpora-ui`?** It renders a hidden
   zero-width leading span, so `justify-between` distributes across three
   children and centres your content. Use `flex-1` on the content block.
2. **Does `className` land where you think?** On `Input` it goes to the wrapper
   (`data-slot="input-control"`), not the inner element. Read the upstream source:
   `cat node_modules/@exegia/corpora-ui/src/components/ui/<name>.tsx`.
3. **Are you fighting the design system?** A white `bg-card` row on a white panel
   with a 5%-opacity border is invisible. Match the surface vocabulary already in
   use (`hover:bg-muted/60` for list rows, `Card` for standalone rows).
4. **Measure, don't eyeball.** For alignment, compare child box centres against
   the container midpoint via `javascript_tool` — see
   [docs/testing.md](../../../docs/testing.md).

## 1. Rows and cards

Reference implementation: `ProjectRow` in `app/routes/project.tsx`.

- Clickable row that also has action buttons → `Card render={<li />}` plus a
  `Link` with `after:absolute after:inset-0`. Never a `Button`-as-link wrapping
  the row: that nests `<button>` inside `<a>`.
- Leading icon in a `size-10 rounded-xl` tile. Reuse the icon the route's empty
  state already uses, so the two agree.
- Focus ring on the card (`has-[a:focus-visible]:ring-2`) — the link is only as
  wide as its text.
- Actions get `z-10`, and reveal on **both** `group-hover/row` and
  `group-focus-within/row`. Hover-only means keyboard users can never see them.
- Map status → badge variant; don't hardcode one variant for every state.

## 2. Loading skeletons

- The loader returns un-awaited promises; the component resolves them in
  `<Await>` behind `<Suspense>`. Navigation then commits immediately.
- Skeleton calls `useLoadingSound()`, loaded component calls `useReadySound()`.
- `role="status"` + `aria-label="Loading <thing>"`.
- Mirror the loaded layout exactly — same tile sizes, same gaps — or content
  arriving will jump.
- **Defer only the slow part.** On `/corpus` the upload controls render
  immediately and only the list suspends.
- **Await the primary record on detail routes.** The breadcrumb reads it off
  `loaderData` synchronously, and a morph target can't be behind a fallback.

After adding a skeleton, check for a bare `getByRole("status")` in that route's
tests — the skeleton is also a status region and resolves first.

## 3. Navigation transitions

- Add `viewTransition` to the `Link` / `NavLink` / `Form`.
- The routed region is already named in `app.css`; new links need nothing else.
- For a shared-element morph, name both ends **conditionally** with
  `useViewTransitionState(href)`. A duplicate `view-transition-name` aborts the
  entire transition silently — and lists render one row per record.
- New animations must be covered by the `prefers-reduced-motion` block;
  element-level `motion-reduce:` utilities cannot reach the transition
  pseudo-elements.

## Verify — the part that matters

A transition that was aborted still leaves the page looking right, so a
screenshot proves nothing. Instrument it:

```js
const orig = document.startViewTransition.bind(document)
document.startViewTransition = (cb) => {
  const t = orig(cb)
  t.ready.then(
    () => console.log(document.getAnimations()
      .filter(a => a.effect?.pseudoElement)
      .map(a => a.effect.pseudoElement + " :: " + a.animationName)),
    (e) => console.log("SKIPPED", e))
  return t
}
```

Checklist before reporting done:

- [ ] `bun run typecheck` and `bun run test` clean (ignore the pre-existing
      `only-export-components` lint warnings)
- [ ] Alignment measured numerically, not judged from a screenshot
- [ ] Checked light **and** dark (`resize_window` with `colorScheme`)
- [ ] Hover *and* keyboard-focus states both reachable
- [ ] Errors captured with your own listener, not the pane's stale console buffer
- [ ] Screenshot shared with the user for anything visual

## Don't

- Don't restyle a `ui/*` re-export to fix something that belongs upstream — see
  the `extract-component` skill.
- Don't use `aria-invalid` for a decorative red tint.
- Don't invent a new surface treatment when the app already has one.

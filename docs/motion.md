# Motion and view transitions

Navigation uses the View Transitions API via React Router's `viewTransition`
prop. Every navigation link opts in: sidebar `NavLink`s, project and licence
rows, the breadcrumb trail, the corpus link, both "Back to…" buttons.

The animation lives in `app/app.css` under the view-transitions comment block.
Outgoing is 110ms, incoming 260ms — a slow fade-out reads as lag, a slow fade-in
reads as arrival.

## The name goes on the scroll viewport, not `<main>`

```css
.route-scroll [data-slot="scroll-area-viewport"] {
  view-transition-name: route-content;
}
```

Two reasons this is not on `<main>`:

- **Snapshot size.** `<main>` is inside a `ScrollArea` and measures ~47,000px on
  `/licenses`. Naming it makes the UA snapshot the full scroll height, well past
  the GPU's max texture size. The viewport's box is bounded (~viewport height)
  and stable across routes.
- **Scope.** Several `ScrollArea`s are mounted at once — the sidebar has one. A
  bare `[data-slot="scroll-area-viewport"]` selector would name all of them.

Naming only the routed region also means the sidebar, header and breadcrumb are
left to the root group and stay put instead of sliding with the content.

## A duplicate name aborts the whole transition

Two elements carrying the same `view-transition-name` at capture time kills the
transition — **silently**, no console error. This is the single biggest footgun
here, and it is why:

- the viewport selector is scoped to `.route-scroll`, and
- the shared-element morph applies its name conditionally.

## Shared-element morph (list row → detail heading)

The project row title travels and resizes into the detail `h1`. Both ends use
`useViewTransitionState` so the name exists **only** while that specific
navigation is in flight:

```tsx
// list row
const morphing = useViewTransitionState(href)
<h3 style={{ viewTransitionName: morphing ? "project-title" : "none" }}>

// detail heading
const morphing = useViewTransitionState(`/project/${project.id}`)
<h1 style={{ viewTransitionName: morphing ? "project-title" : "none" }}>
```

The list renders one row per project, so an unconditional name would put it on
every row and disable all transitions app-wide.

Requirements for adding another morph pair:

1. The link must have `viewTransition`.
2. Both elements must be named with the same string, conditionally.
3. **The incoming element must actually be rendered at transition time** — not
   behind a Suspense fallback. This is why the project header sits outside its
   boundary.

The morph is one-directional. Going back via the breadcrumb doesn't know which
row to morph into, so the title just fades with the content.

## Reduced motion needs an explicit rule

The app's `motion-reduce:` Tailwind utilities are element-level and **cannot**
reach `::view-transition-*` pseudo-elements. Without this block the UA cross-fade
runs for users who asked for no motion:

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) { animation: none !important; }
}
```

## How to verify a transition rather than assume it

Wrapping `startViewTransition` is the only reliable check — a transition that
was aborted still leaves the page looking correct afterwards.

```js
const orig = document.startViewTransition.bind(document)
document.startViewTransition = (cb) => {
  const t = orig(cb)
  t.ready.then(
    () => console.log(document.getAnimations()
      .filter(a => a.effect?.pseudoElement)
      .map(a => a.effect.pseudoElement + " :: " + a.animationName)),
    (e) => console.log("SKIPPED", e),
  )
  return t
}
```

Expect `route-enter` / `route-exit` on `::view-transition-*(route-content)`, and
`-ua-view-transition-group-anim-project-title` for a morph.

**Drive one navigation at a time.** Starting a second navigation while a
transition is in flight skips the first — that is correct browser behaviour, but
a script that clicks two links a few hundred ms apart reports every transition as
skipped and looks exactly like a real breakage. Assert on a single click, then
navigate again.

Also assert exactly one element holds a given name:

```js
[...document.querySelectorAll('*')]
  .filter(e => getComputedStyle(e).viewTransitionName === 'project-title').length
```

To check the reduced-motion rule without emulating the media query, inject the
same declaration with the query stripped and confirm `getAnimations()` returns
nothing for those pseudo-elements.

## Vite dev-server note

`vite.config.ts` declares every bare import in `optimizeDeps.include`. Without
it Vite discovers deps lazily per route, re-optimises mid-session, and in-flight
requests for the previous hash fail with **504 Outdated Optimize Dep**. Add new
dependencies to that list — including `@base-ui/react/*` subpaths.

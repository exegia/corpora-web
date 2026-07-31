# Testing notes

Vitest + jsdom + Testing Library. `app/**/*.test.{ts,tsx}`. Routes are exercised
through `createRoutesStub`.

```tsx
const Stub = createRoutesStub([
  {
    path: "/project",
    Component: ProjectRoute,
    HydrateFallback: () => null, // required: the route has a clientLoader
    // biome-ignore lint: route module functions match at runtime
    loader: clientLoader as never,
    action: clientAction as never,
  },
])
```

`HydrateFallback` is not optional — without it a route with a `clientLoader`
warns and can render nothing.

## Gotchas learned the hard way

**Deferred loaders mean `findBy*`, not `getBy*`.** Content behind `<Await>` is
not present on first render.

**A heading is not a proxy for "loaded".** `project/:projectId` paints its header
from the awaited project *before* the panels resolve. Awaiting the `h1` and then
calling `getByText` on panel content fails — await the panel content itself.

**A bare `getByRole("status")` is ambiguous.** Loading skeletons are status live
regions, and they resolve *first*. Where a route has both a skeleton and a status
banner, query by text and assert the role:

```tsx
expect(await screen.findByText(/in review/i)).toHaveAttribute("role", "status")
```

**An open Base UI modal marks the rest of the app `aria-hidden`.** Background
content that is still mounted becomes invisible to `getByRole` / `getByText`. To
assert something survived while a dialog is open, check
`document.body.textContent` instead — otherwise you will "prove" an unmount that
never happened.

**Deletes are gated.** The confirm button is disabled until `DELETE` is typed:

```tsx
const confirm = screen.getByRole("button", { name: "Delete project" })
expect(confirm).toBeDisabled()
await user.type(screen.getByRole("textbox"), "DELETE")
await user.click(confirm)
```

## Tests that pin down invariants

`app/routes/project.test.tsx` → *"does not flash the skeleton back in when an
action revalidates"* protects the assumption the whole deferred-loader design
rests on. See [data-loading.md](data-loading.md). Don't remove it.

## Verifying UI in the browser

Prefer measuring over eyeballing — the Browser pane's console buffer persists
across reloads *and* server restarts, so stale errors from a mid-edit state look
current. Install your own capture (`window.addEventListener('error', …)` plus a
`console.error` wrapper) after load and read that instead.

Useful measurements:

- Vertical centring: compare each child's box centre against the row's midpoint
  rather than trusting a screenshot.
- Hover/focus states: a synthetic `hover` may not produce a CSS `:hover` in the
  pane. Real `.focus()` does trigger `:focus-visible` / `:focus-within`, so test
  the focus path and reason about hover from the shared selector.
- Reading a computed style immediately after `.focus()` can catch a transition
  mid-flight; and inside a focus-trapped dialog `.blur()` returns focus to the
  same element. Move focus somewhere real instead.

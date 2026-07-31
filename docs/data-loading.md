# Data loading

Every route is client-side (`clientLoader` / `clientAction`). Route modules
import only from `app/lib/*` — never `supabase-js` directly.

## Deferred loaders + Suspense skeletons

Data-bearing loaders return **un-awaited** promises. The component resolves them
in `<Await>` behind a `<Suspense>` fallback that is a route-shaped skeleton, so
navigation commits immediately instead of freezing on the previous page.

```ts
export async function clientLoader() {
  // Deliberately not awaited: navigation completes immediately and the
  // component suspends on this promise, showing the skeleton meanwhile.
  const data = Promise.all([listProjects(), listUsers()]).then(([projects, users]) => ({
    projects,
    users,
  }))
  return { data }
}
```

Conventions:

- The skeleton component calls `useLoadingSound()`; the loaded component calls
  `useReadySound()`.
- Skeletons carry `role="status"` and `aria-label="Loading <thing>"`.
- Skeletons mirror the loaded layout (same spacing, same shapes) so there is no
  jump when content arrives.
- Defer only what is slow. On `/corpus` just the document list suspends — the
  upload controls render immediately and stay interactive.

Routes with no loader (`dashboard`, `library`, `references`) need none of this.

## The invariant this rests on

A revalidation hands `<Await>` a **new** promise every time. React Router keeps
the resolved UI mounted rather than re-suspending. If that ever changed, every
fetcher action — `set-status`, `link-corpus`, `unlink-corpus` — would blank its
page back to a skeleton.

This is verified by the test *"does not flash the skeleton back in when an action
revalidates"* in `app/routes/project.test.tsx`. **Do not delete it.** Three
routes depend on the behaviour it pins down.

## `loaderData` is a public contract

`app/components/breadcrumb/component.tsx` reads `project` / `licence` off
`loaderData` **synchronously** via `useMatches`, using structural type guards.

Reshaping a detail loader therefore breaks the breadcrumb — and nothing
type-errors, because the guards are runtime `typeof` checks that simply stop
matching. The trail silently degrades to its literal fallback ("Project",
"License") instead of showing the record's name.

This happened once already. Consequences for detail loaders:

- **Await the primary record.** It is one indexed row, the breadcrumb needs it
  synchronously, and it settles not-found before render.
- Defer only the expensive follow-up queries. On `project/:projectId` those are
  the five parallel ones behind `PanelsSkeleton`; on `licenses/:licenceId` it is
  the licence text, which has its own boundary.
- Before reshaping any loader, run:
  `grep -rn 'useMatches\|useRouteLoaderData\|loaderData' app | grep -v '\.test\.'`

Note `typeof null === "object"`, so the not-found case still satisfies the
guards and correctly falls through to the `?? "Project"` default.

## Don't put a shared-element morph target behind a boundary

`project/:projectId` renders its header **outside** the Suspense boundary, from
the awaited `project`. That is not only for perceived speed: a view-transition
morph target must exist in the incoming snapshot, and a skeleton there gives the
transition nothing to morph into. See [motion.md](motion.md).

# UI patterns

## `Button` renders a hidden leading span

`Button` from `@exegia/corpora-ui` always emits a zero-width
`<span data-slot="button-loading-indicator">` as its **first** child, before
whatever children you pass.

So `className="justify-between"` on a Button distributes space across *three*
flex children — hidden span, your content, your trailing icon — and parks the
content in the middle. It reads as an unexplainable centring bug.

Put `flex-1` on the content block instead of relying on `justify-between`.

The Button also owns `[&_svg]` rules that set icon size (`size-4.5` /
`sm:size-4`), opacity and `-mx-0.5` margins. Icons moved out of a Button into a
plain container need those restated — see the chevron in `ProjectRow`.

## Clickable rows: Card + stretched link

Rows that are themselves a link *and* carry action buttons are built as a `Card`
rendered as the `<li>`:

```tsx
<Card className="group/row flex-row items-center gap-4 has-[a:focus-visible]:ring-2" render={<li />}>
  <span aria-hidden="true">{/* icon tile */}</span>
  <div className="flex min-w-0 flex-1 flex-col">
    <h3>
      {/* after: stretches the link over the whole card */}
      <Link className="after:absolute after:inset-0 after:rounded-2xl" to={href} viewTransition>
        {name}
      </Link>
    </h3>
  </div>
  <div className="absolute right-3 z-10 opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100">
    {/* Edit / Delete */}
  </div>
</Card>
```

Why not a `Button` rendered as a `Link` wrapping the row: that nests `<button>`
inside `<a>`, which is invalid HTML and handled inconsistently by browsers.

Three details that are easy to get wrong:

- The focus ring goes on the **card** (`has-[a:focus-visible]:ring-2`). The link
  is only as wide as the title text, so a ring on the link hugs the text.
- Actions need `z-10` to sit above the link's stretched overlay.
- Hover-revealed actions must **also** respond to `group-focus-within/row`.
  Otherwise a keyboard user hides the chevron (if it fades on focus) and gets
  nothing in its place — the actions stay invisible and unreachable.

Reference: `ProjectRow` in `app/routes/project.tsx`.

## Status badges

Map status → badge variant rather than hardcoding one. Keep the colour meanings
aligned with `STATUS_DOT_COLORS` in
`app/components/project/project-detail-panel.tsx`:

| status | variant |
| --- | --- |
| `draft` | `secondary` |
| `started` | `info` |
| `ready-for-review` | `warning` |
| `published` | `success` |
| `failed` | `error` |

## Irreversible deletes need a typed confirmation

`ConfirmDeleteDialog` (`app/components/confirm-delete-dialog.tsx`) gates a
delete behind typing `DELETE`, matched **exactly and case-sensitively** — a
trimming or case-insensitive match defeats the point, which is to force the
description to be read. It owns its own fetcher, so pending and error states
come free at each call site.

Use it for irreversible deletes only. `unlink-corpus` is deliberately one click:
it is reversible (the corpus stays in the library, "Add reference" re-adds it),
and gating it would spend the DELETE signal on something with nothing at stake.

**Do not** style the input with `aria-invalid`, tempting as it is — the wrapper
already has a full destructive look keyed off it. On an untouched empty field it
announces "invalid" to screen readers when the user has done nothing wrong, and
it fires the wrapper's `has-aria-invalid:animate-input-shake` on every open. Use
the `destructive` tokens directly.

`className` on `Input` lands on the **wrapper** (`data-slot="input-control"`),
which carries the border and background. The placeholder lives on the inner
element, so it needs `[&_input]:placeholder:…`.

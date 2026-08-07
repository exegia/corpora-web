# UI patterns

## `Button` renders a hidden leading span

`Button` from `@exegia/corpora-ui` always emits a zero-width
`<span data-slot="button-loading-indicator">` as its **first** child, before whatever children you pass.

So `className="justify-between"` on a Button distributes space across *three*
flex children — hidden span, your content, your trailing icon — and parks the content in the middle. It reads as an
unexplainable centring bug.

Put `flex-1` on the content block instead of relying on `justify-between`.

The Button also owns `[&_svg]` rules that set icon size (`size-4.5` /
`sm:size-4`), opacity and `-mx-0.5` margins. Icons moved out of a Button into a plain container need those restated —
see the chevron in `ProjectRow`.

## Clickable rows: coss `Table` + stretched link

Rows that are themselves a link *and* carry action buttons are `TableRow`s in a
`<Table variant="card">`. The table is `app/components/ui/table.tsx`, vendored from the `@coss` registry; the `card`
variant is what gives the body its rounded, bordered card look instead of plain rules.

```tsx
<TableRow className="group/row">
  <TableCell className="w-full max-w-0">
    {/* icon tile + title + description */}
    <h3 className="truncate">
      {/* after: stretches the link over the whole row */}
      <Link
        className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:inset-ring-2 focus-visible:after:inset-ring-ring"
        to={href}
        viewTransition
      >
        {name}
      </Link>
    </h3>
  </TableCell>
  <TableCell>{/* status badge */}</TableCell>
  <TableCell>{/* relative updated time */}</TableCell>
  <TableCell>
    <div className="relative z-10 grid items-center justify-items-end">
      <ChevronRight className="pointer-events-none [grid-area:1/1] group-hover/row:opacity-0" />
      <div className="flex [grid-area:1/1] opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100">
        {/* Edit / Delete */}
      </div>
    </div>
  </TableCell>
</TableRow>
```

Why not a `Button` rendered as a `Link` wrapping the row: that nests `<button>`
inside `<a>`, which is invalid HTML and handled inconsistently by browsers.

Five details that are easy to get wrong:

- **`after:inset-0` resolves against `TableRow`**, which the coss table leaves
  `relative`. That is the only reason the overlay covers the whole row instead of just the title cell.
- **The focus ring goes on the overlay, not the `<tr>`.** Cell backgrounds paint *above* a row's own background and
  box-shadow, so `ring-2` on a `TableRow`
  disappears under the cells. `focus-visible:after:inset-ring-2` on the link rides the overlay, a positioned descendant
  that paints above every cell.
- **`z-10` goes on a wrapper inside the actions cell, never on the cell itself.**
  A positioned `<td>` paints its `bg-card` above the overlay and chops the focus ring in half across that column. A
  positioned wrapper clears the overlay without covering the row's edges.
- **Truncation needs `w-full max-w-0` on the cell.** `w-full` hands that column the slack; `max-w-0` stops auto table
  layout from widening the cell to fit its content, which would push the table into its container's horizontal scroll.
- Hover-revealed actions must **also** respond to `group-focus-within/row`. Otherwise a keyboard user hides the chevron
  (if it fades on focus) and gets nothing in its place — the actions stay invisible and unreachable. Stacking the
  chevron and the actions in one `[grid-area:1/1]` keeps the swap reflow-free; the chevron then needs
  `pointer-events-none`, or it swallows clicks on the buttons it is sitting on top of.

`className` on `Table` lands on the inner `<table>`, not the scroll container — put page spacing on a wrapper element
(same trap as `Input`, below).

Reference: `ProjectRow` / `ProjectTable` in `app/routes/project.tsx`.

## Status badges

Map status → badge variant rather than hardcoding one. Keep the colour meanings aligned with `STATUS_DOT_COLORS` in
`../app/components/project/detail/panel.tsx`:

| status             | variant     |
|--------------------|-------------|
| `draft`            | `secondary` |
| `started`          | `info`      |
| `ready-for-review` | `warning`   |
| `published`        | `success`   |
| `failed`           | `error`     |

## Irreversible deletes need a typed confirmation

`ConfirmDeleteDialog` (`app/components/confirm-delete-dialog.tsx`) gates a delete behind typing `DELETE`, matched
**exactly and case-sensitively** — a trimming or case-insensitive match defeats the point, which is to force the
description to be read. It owns its own fetcher, so pending and error states come free at each call site.

Use it for irreversible deletes only. `unlink-corpus` is deliberately one click:
it is reversible (the corpus stays in the library, "Add reference" re-adds it), and gating it would spend the DELETE
signal on something with nothing at stake.

**Do not** style the input with `aria-invalid`, tempting as it is — the wrapper already has a full destructive look
keyed off it. On an untouched empty field it announces "invalid" to screen readers when the user has done nothing wrong,
and it fires the wrapper's `has-aria-invalid:animate-input-shake` on every open. Use the `destructive` tokens directly.

`className` on `Input` lands on the **wrapper** (`data-slot="input-control"`), which carries the border and background.
The placeholder lives on the inner element, so it needs `[&_input]:placeholder:…`.

import { ChevronRight, Trash2 } from "lucide-react"
import { Link, useViewTransitionState } from "react-router"
import { Blocks } from "@/components/blocks"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/format"
import type { RowProps } from "./types"
import { formatSize, subtitleOf, TYPE_BADGE_VARIANTS, TYPE_LABELS } from "./utils"

/**
 * One corpus in the table — a stretched-link row (docs/ui-patterns.md): the
 * whole row navigates to the detail page without nesting the delete button
 * inside the link.
 */
export default function Row({ document }: RowProps) {
  const href = `/corpus/${document.id}`
  // Only the row being opened claims the shared name — a view-transition-name
  // present on two elements at once aborts the whole transition.
  const morphing = useViewTransitionState(href)

  return (
    <TableRow className="group/row">
      <TableCell className="w-full max-w-0">
        <div className="flex items-center gap-3">
          <Avatar className="size-8 shrink-0">
            <AvatarFallback>
              {document.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h3
              className="truncate font-medium"
              style={{
                viewTransitionName: morphing ? "corpus-title" : "none",
              }}
            >
              <Link
                className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:inset-ring-2 focus-visible:after:inset-ring-ring"
                to={href}
                viewTransition
              >
                {document.name}
              </Link>
            </h3>
            <p className="truncate text-muted-foreground text-xs">
              {subtitleOf(document)}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {document.corpusType ? (
          <Badge size="sm" variant={TYPE_BADGE_VARIANTS[document.corpusType]}>
            {TYPE_LABELS[document.corpusType]}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </TableCell>
      <TableCell className="text-sm tabular-nums">
        {document.docsCount?.toLocaleString("en-US") ?? "—"}
      </TableCell>
      <TableCell className="text-sm tabular-nums">
        {formatSize(document.sizeBytes)}
      </TableCell>
      <TableCell className="text-sm">{document.language ?? "—"}</TableCell>
      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
        {formatDate(document.convertedAt ?? document.uploadedAt)}
      </TableCell>
      <TableCell>
        {/* z-10 on this wrapper, never the cell — a positioned cell paints its
            background above the link overlay and chops the focus ring. */}
        <div className="relative z-10 grid items-center justify-items-end">
          <ChevronRight
            aria-hidden="true"
            className="pointer-events-none size-4 text-muted-foreground transition-[transform,opacity] [grid-area:1/1] group-focus-within/row:opacity-0 group-hover/row:translate-x-0.5 group-hover/row:opacity-0"
          />
          <div className="flex items-center [grid-area:1/1] opacity-0 transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100">
            <Blocks.ConfirmDelete
              confirmLabel="Delete corpus"
              description={`This permanently deletes “${document.name}” and its version history from your library. Projects that reference it will show it as unavailable. This cannot be undone.`}
              fields={{ documentId: document.id }}
              intent="delete-document"
              title={`Delete “${document.name}”?`}
              trigger={
                <Button
                  aria-label="Delete"
                  className="text-destructive-foreground hover:bg-destructive/8"
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </Button>
              }
            />
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}

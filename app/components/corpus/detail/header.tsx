import { useViewTransitionState } from "react-router"
import { Badge } from "@/components/ui/badge"
import type { HeaderProps } from "./types"

/** Detail page header: name, format badge, status, licence, actions slot. */
export default function Header({ document, actions }: HeaderProps) {
  // The title morphs out of the list row it was opened from. Named only while
  // that navigation is in flight, so the name is never on two elements at once.
  const morphing = useViewTransitionState(`/corpus/${document.id}`)
  const format = document.filename?.split(".").pop()?.toUpperCase() ?? null

  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1
          className="break-words font-heading text-2xl font-bold"
          style={{ viewTransitionName: morphing ? "corpus-title" : "none" }}
        >
          {document.name}
        </h1>
        {document.description && (
          <p className="mt-1 break-words text-muted-foreground">
            {document.description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          {format && <Badge size="sm" variant="secondary">{format}</Badge>}
          {document.status && (
            <span className="flex items-center gap-1.5 text-warning-foreground capitalize">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-current"
              />
              {document.status}
            </span>
          )}
          {document.licence && (
            <span className="text-muted-foreground">{document.licence}</span>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </header>
  )
}

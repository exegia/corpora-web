import { createElement } from "react"
import { useViewTransitionState } from "react-router"
import { fileIconFor, formatOf } from "@/components/corpus/list/utils"
import { Badge } from "@/components/ui/badge"
import { License } from "@/components/licenses"
import type { HeaderProps } from "./types"

/** Detail page header: name, format badge, licence, explorer tabs, actions. */
export default function Header({
  document,
  actions,
  tabs,
  title,
  description,
  hideMeta,
}: HeaderProps) {
  // The title morphs out of the list row it was opened from. Named only while
  // that navigation is in flight, so the name is never on two elements at once.
  const morphing = useViewTransitionState(`/corpus/${document.id}`)
  const format = formatOf(document)
  const fileIcon = fileIconFor(document)
  const heading = title ?? document.name
  const blurb = description ?? (hideMeta ? undefined : document.description)

  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-4">
        {fileIcon && !hideMeta &&
          createElement(fileIcon, {
            className: "size-16 shrink-0",
            size: 64,
            title: `${format} file`,
          })}
        <div className="min-w-0">
          <h1
            className="font-heading text-2xl font-bold break-words"
            style={{ viewTransitionName: morphing ? "corpus-title" : "none" }}
          >
            {heading}
          </h1>
          {blurb && (
            <p className="mt-1 break-words text-muted-foreground">{blurb}</p>
          )}
          {!hideMeta && (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
              <Badge size="sm" variant="outline">
                {format}
              </Badge>
              {document.status && (
                <span
                  className={`flex items-center gap-1.5 capitalize ${
                    document.status === "converted"
                      ? "text-success-foreground"
                      : "text-warning-foreground"
                  }`}
                >
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                  {document.status}
                </span>
              )}
              {document.licence && (
                <License.DetailSheet label={document.licence} />
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex min-w-0 flex-col items-end gap-2">
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
        {tabs}
      </div>
    </header>
  )
}

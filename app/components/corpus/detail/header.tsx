import { createElement } from "react"
import { useViewTransitionState } from "react-router"
import { fileIconFor, formatOf } from "@/components/corpus/list/utils"
import { Badge } from "@/components/ui/badge"
import type { HeaderProps } from "./types"

/** Detail page header: name, format badge, status, licence, actions slot. */
export default function Header({ document, actions }: HeaderProps) {
    // The title morphs out of the list row it was opened from. Named only while
    // that navigation is in flight, so the name is never on two elements at once.
    const morphing = useViewTransitionState(`/corpus/${document.id}`)
    const format = formatOf(document)
    const fileIcon = fileIconFor(document)

    return (
        <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-4">
                {fileIcon &&
                    // Same looked-up component the list row uses, at the large size.
                    createElement(fileIcon, {
                        className: "size-16 shrink-0",
                        size: 64,
                        title: `${format} file`,
                    })}
                <div className="min-w-0">
                    <h1
                        className="font-heading text-2xl font-bold break-words"
                        style={{ viewTransitionName: morphing ? "corpus-title" : "none" }}>
                        {document.name}
                    </h1>
                    {document.description && (
                        <p className="mt-1 break-words text-muted-foreground">{document.description}</p>
                    )}
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
                                }`}>
                                <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                                {document.status}
                            </span>
                        )}
                        {document.licence && <span className="text-muted-foreground">{document.licence}</span>}
                    </div>
                </div>
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
    )
}

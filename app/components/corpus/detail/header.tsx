import { createElement } from "react"
import { useViewTransitionState } from "react-router"
import { fileIconFor, formatOf } from "@/lib/utils"
import { Badge } from "@exegia/corpora-ui/ui/badge"
import { License } from "@/components/licenses"
import type { HeaderProps } from "./types"
import { Button, Text } from "@exegia/corpora-ui"
import { exportDocument } from "./utils"
import { Download } from "lucide-react"
import { Blocks } from "@/components/blocks"
import { ExploreTabs } from "../tabs"

/** Detail page header: name, format badge, licence, explorer tabs, actions. */
export default function Header({ document, tabs, panel, title, description, hideMeta }: HeaderProps) {

    const format = formatOf(document)
    const FileIcon = fileIconFor(document)
    const heading = title ?? document.name
    const blurb = description ?? (hideMeta ? undefined : document.description)

    return (
        <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-row gap-2">
                {FileIcon && <FileIcon title={`${format} file`} className="size-12 shrink-0" size={48} />}
                <div className="flex flex-col">
                    <Text.Heading>
                        {heading}
                        <Badge size="sm" variant="warning" className="ml-2">
                            {format}
                        </Badge>
                    </Text.Heading>
                    <div>
                        {blurb && <p className="mt-1 wrap-break-word text-muted-foreground">{blurb}</p>}
                        {document.status && (
                            <span
                                className={`flex items-center gap-1.5 text-xs capitalize ${
                                    document.status === "converted"
                                        ? "text-success-foreground"
                                        : "text-warning-foreground"
                                }`}>
                                <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                                {document.status}
                            </span>
                        )}
                        {document.licence && <License.DetailSheet label={document.licence} />}
                    </div>
                </div>
            </div>
            {tabs && <ExploreTabs tabs={tabs} panel={panel} />}
            <div className="flex min-w-0 flex-col items-end gap-2">
                <div className="flex shrink-0 items-center gap-2">
                    <Blocks.ConfirmDelete
                        confirmLabel="Delete corpus"
                        description={`This permanently deletes “${document.name}” and its version history from your library. Projects that reference it will show it as unavailable. This cannot be undone.`}
                        fields={{ documentId: document.id }}
                        intent="delete-document"
                        title={`Delete “${document.name}”?`}
                    />
                    <Button onClick={() => exportDocument(document)} size="sm" type="button" variant="secondary">
                        <Download /> Export
                    </Button>
                </div>
            </div>
        </header>
    )
}

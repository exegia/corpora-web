import type { ReactNode } from "react"
import { CONVERSION_PANEL_WIDTH } from "@/components/corpus/convert/utils"
import { useAppShellPanels } from "@/components/layouts/shell-panels"
import { License } from "@/components/licenses"
import { Button } from "@/components/ui/button"
import EditPanel from "./edit-panel"
import type { DetailsCardProps } from "./types"
import { Card, Frame, FrameHeader } from "@exegia/corpora-ui"
import { File, Pencil } from "lucide-react"
import { cn, formatSize, formatDateTime, formatCount } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { TYPE_LABELS } from "@/components/constant"

function Item({ label, children, className }: { label: string; children?: ReactNode; className?: string }) {
    return (
        <div className="flex flex-row sm:flex-col">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className={cn("mt-0.5 text-sm", className, children ? "" : "text-muted-foreground/50 italic")}>
                {children ?? "unknown"}
            </dd>
        </div>
    )
}

function DetailsBody({ document }: DetailsCardProps) {
    const { openPanel, setOpen, resizePanel } = useAppShellPanels()

    function handleEdit() {
        resizePanel(CONVERSION_PANEL_WIDTH)
        openPanel("right", <EditPanel document={document} onClose={() => setOpen(false, "right")} />)
    }

    return (
        <Frame className="flex-1 rounded-lg">
            <FrameHeader className="mb-2 flex flex-row items-center justify-between px-3.5 py-2">
                <span className="text-sm text-secondary-foreground/60">Details</span>
                <Button className="flex gap-2" onClick={handleEdit} size="sm" type="button" variant="outline">
                    <Pencil className="scale-90" /> Edit
                </Button>
            </FrameHeader>
            <Card render={<dl />} className="flex flex-col gap-3 p-4">
                <Item label="Title">{document.name}</Item>
                <Item label="Description">{document.description}</Item>
                <Item label="Type">{document.corpusType ? TYPE_LABELS[document.corpusType] : undefined}</Item>
                <Item label="Size">{formatSize(document.sizeBytes)}</Item>
                <Item label="Nodes">{formatCount(document.nodes)}</Item>
                <Item label="Documents">{formatCount(document.docsCount)}</Item>
                <Item label="Language">{document.language}</Item>
                <Item label="Source format">
                    <Badge variant="secondary" size="lg">
                        <File aria-hidden="true" />
                        {document.sourceFormat}
                    </Badge>
                </Item>
                <Item label="License">{document.licence && <License.DetailSheet label={document.licence} />}</Item>
                <Item label="Uploaded">{formatDateTime(document.uploadedAt)}</Item>
                <Item label="Converted">{formatDateTime(document.convertedAt)}</Item>
            </Card>
        </Frame>
    )
}
/** The left-hand Details card on the corpus detail page. */
export default function DetailsCard(props: DetailsCardProps) {
    return <DetailsBody {...props} />
}

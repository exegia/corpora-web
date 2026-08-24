import { License } from "@/components/licenses"
import { formatSize } from "../list/utils"
import Panel from "./panel"
import type { DetailsCardProps } from "./types"
import { formatCount, formatDateTime } from "./utils"

function Item({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  )
}

/** The left-hand Details card on the corpus detail page. */
export default function DetailsCard({ document }: DetailsCardProps) {
  return (
    <Panel title="Details">
      <dl className="flex flex-col gap-3">
        <Item label="Size">{formatSize(document.sizeBytes)}</Item>
        <Item label="Nodes">{formatCount(document.nodes)}</Item>
        <Item label="Documents">{formatCount(document.docsCount)}</Item>
        <Item label="Language">{document.language ?? "—"}</Item>
        <Item label="Source format">{document.sourceFormat ?? "—"}</Item>
        <Item label="License">
          {document.licence ? (
            <License.DetailSheet label={document.licence} />
          ) : (
            "—"
          )}
        </Item>
        <Item label="Uploaded">
          {document.uploadedAt ? formatDateTime(document.uploadedAt) : "—"}
        </Item>
        <Item label="Converted">
          {document.convertedAt ? formatDateTime(document.convertedAt) : "—"}
        </Item>
      </dl>
    </Panel>
  )
}

import { useContext, type ReactNode } from "react"
import { CONVERSION_PANEL_WIDTH } from "@/components/corpus/convert/utils"
import {
  ShellPanelsContext,
  useAppShellPanels,
} from "@/components/layouts/shell-panels"
import { License } from "@/components/licenses"
import { Button } from "@/components/ui/button"
import { formatSize, TYPE_LABELS } from "../list/utils"
import EditPanel from "./edit-panel"
import Panel from "./panel"
import type { DetailsCardProps } from "./types"
import { formatCount, formatDateTime } from "./utils"

function Item({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  )
}

function DetailsBody({ document }: DetailsCardProps) {
  const { openPanel, setOpen, resizePanel } = useAppShellPanels()

  function handleEdit() {
    resizePanel(CONVERSION_PANEL_WIDTH)
    openPanel(
      "right",
      <EditPanel
        document={document}
        onClose={() => setOpen(false, "right")}
      />,
    )
  }

  return (
    <Panel
      title="Details"
      actions={
        <Button onClick={handleEdit} size="sm" type="button" variant="outline">
          Edit
        </Button>
      }
    >
      <dl className="flex flex-col gap-3">
        <Item label="Title">{document.name}</Item>
        <Item label="Description">{document.description || "—"}</Item>
        {document.corpusType ? (
          <Item label="Type">{TYPE_LABELS[document.corpusType]}</Item>
        ) : null}
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

/** No-op shell so route tests (no AppLayout) can still render the card. */
const FALLBACK_PANELS = {
  openPanel: () => {},
  setOpen: () => {},
  resizePanel: () => {},
} as never

/** The left-hand Details card on the corpus detail page. */
export default function DetailsCard(props: DetailsCardProps) {
  const panels = useContext(ShellPanelsContext)
  if (panels) return <DetailsBody {...props} />
  return (
    <ShellPanelsContext.Provider value={FALLBACK_PANELS}>
      <DetailsBody {...props} />
    </ShellPanelsContext.Provider>
  )
}

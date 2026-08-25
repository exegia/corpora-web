import { useMemo, useState } from "react"
import { ChevronRight, ListTree } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import CorporaApi, { type CorpusArchive } from "@/lib/api"
import Corpus, { type CorpusDocument } from "@/lib/corpus"
import Panel from "./panel"
import type { StructureNode } from "./types"
import { formatCount } from "./utils"

function LoadingRows({ depth }: { depth: number }) {
  return (
    <div
      aria-label="Loading children"
      className="flex flex-col gap-2 px-4 py-2"
      role="status"
      style={{ paddingInlineStart: `${(depth + 1) * 1.25 + 1}rem` }}
    >
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-5/6" />
      <Skeleton className="h-8 w-2/3" />
    </div>
  )
}

function NodeRow({
  node,
  depth,
  archive,
}: {
  node: StructureNode
  depth: number
  archive: CorpusArchive | null
}) {
  const expandable =
    (node.childCount ?? 0) > 0 || (node.children?.length ?? 0) > 0
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [children, setChildren] = useState<StructureNode[]>(node.children ?? [])

  async function onOpenChange(next: boolean) {
    setOpen(next)
    if (!next || children.length > 0 || !expandable) return
    setLoading(true)
    try {
      setChildren(await loadChildren(node, archive))
    } catch {
      setChildren([])
    } finally {
      setLoading(false)
    }
  }

  const row = (
    <div
      className="grid grid-cols-[minmax(0,1fr)_7rem] items-center gap-3 border-b px-4 py-2 last:border-b-0"
      style={{ paddingInlineStart: `${depth * 1.25 + 1}rem` }}
    >
      <div className="flex min-w-0 items-center gap-2">
        {expandable ? (
          <CollapsibleTrigger
            aria-label={`Expand ${node.label}`}
            className="min-w-0 data-panel-open:[&_svg]:rotate-90"
            render={<Button size="sm" variant="ghost" />}
          >
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            <span className="font-medium">{node.type}</span>
            <span className="truncate text-muted-foreground text-xs">
              {node.label}
            </span>
          </CollapsibleTrigger>
        ) : (
          <span className="flex min-w-0 items-center gap-2 ps-9">
            <span className="font-medium">{node.type}</span>
            {node.slotType && (
              <Badge size="sm" variant="outline">
                Slot type
              </Badge>
            )}
            <span className="truncate text-muted-foreground text-xs">
              {node.label}
            </span>
          </span>
        )}
      </div>
      <span className="text-right text-sm tabular-nums">
        {formatCount(node.childCount)}
      </span>
    </div>
  )

  if (!expandable) return row

  return (
    <Collapsible onOpenChange={onOpenChange} open={open}>
      {row}
      <CollapsiblePanel>
        {loading ? (
          <LoadingRows depth={depth} />
        ) : (
          children.map((child) => (
            <NodeRow
              archive={archive}
              depth={depth + 1}
              key={child.id}
              node={child}
            />
          ))
        )}
      </CollapsiblePanel>
    </Collapsible>
  )
}

async function loadChildren(
  node: StructureNode,
  archive: CorpusArchive | null,
): Promise<StructureNode[]> {
  if (node.children?.length) return node.children
  if (archive && node.ref) {
    const page = await CorporaApi.fetchCorpusSections(archive, {
      parent: node.ref,
      limit: 50,
    })
    return page.items.map((item) =>
      Corpus.Explore.structureNodeFromSection(item, node.type),
    )
  }
  return []
}

/** Structure tab: collapsible instance tree, collapsed until a parent is opened. */
export default function Structure({
  document,
  archive,
}: {
  document: CorpusDocument
  archive: CorpusArchive | null
}) {
  const root = useMemo(
    () => (archive ? Corpus.Explore.structureRootFromIndex(document, archive.index) : null),
    [document, archive],
  )

  if (!root) {
    return (
      <Empty className="py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ListTree />
          </EmptyMedia>
          <EmptyTitle>No structure yet</EmptyTitle>
          <EmptyDescription>
            No live archive is available for this corpus yet.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <Panel bodyClassName="p-0" title="Document hierarchy">
      <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3 border-b px-4 py-2 text-muted-foreground text-xs tracking-wider uppercase">
        <span className="sr-only">Node</span>
        <span className="text-right">Children</span>
      </div>
      <NodeRow archive={archive} depth={0} node={root} />
    </Panel>
  )
}

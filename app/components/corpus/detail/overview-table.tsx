import { ChevronRight } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { OverviewTableProps } from "./types"
import { formatCount } from "./utils"

/** The Overview tab's sections table (title, nodes, words). */
export default function OverviewTable({
  sections,
  onOpenSection,
}: OverviewTableProps) {
  return (
    <div>
      <Table variant="card">
        <TableHeader>
          <TableRow>
            <TableHead className="w-full">Title</TableHead>
            <TableHead>Nodes</TableHead>
            <TableHead>Words</TableHead>
            <TableHead>
              <span className="sr-only">Open</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sections.map((section) => (
            <TableRow
              className={onOpenSection ? "group/row" : undefined}
              key={section.title}
            >
              <TableCell className="w-full max-w-0">
                {onOpenSection ? (
                  <button
                    className="block w-full truncate text-left font-medium outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:inset-ring-2 focus-visible:after:inset-ring-ring"
                    onClick={() => onOpenSection(section)}
                    type="button"
                  >
                    {section.title}
                  </button>
                ) : (
                  <span className="block truncate font-medium">
                    {section.title}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-sm tabular-nums">
                {formatCount(section.nodes)}
              </TableCell>
              <TableCell className="text-sm tabular-nums">
                {formatCount(section.words)}
              </TableCell>
              <TableCell>
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 text-muted-foreground"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

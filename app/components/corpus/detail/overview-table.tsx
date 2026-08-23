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

/** The Overview tab's sections table (title, nodes, words). */
export default function OverviewTable({ sections }: OverviewTableProps) {
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
            <TableRow key={section.title}>
              <TableCell className="w-full max-w-0">
                <span className="block truncate font-medium">
                  {section.title}
                </span>
              </TableCell>
              <TableCell className="text-sm tabular-nums">
                {section.nodes?.toLocaleString("en-US") ?? "—"}
              </TableCell>
              <TableCell className="text-sm tabular-nums">
                {section.words?.toLocaleString("en-US") ?? "—"}
              </TableCell>
              <TableCell>
                {/* Decorative for now — section reading is a later feature. */}
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

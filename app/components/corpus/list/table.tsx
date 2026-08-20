import {
  Table as CossTable,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { TableProps } from "./types"
import Row from "./row"

/** The corpus table chrome plus one Row per document. */
export default function Table({ documents }: TableProps) {
  return (
    // className on Table lands on the inner <table>, not the scroll
    // container, so page spacing goes on a wrapper.
    <div>
      <CossTable variant="card">
        <TableHeader>
          <TableRow>
            <TableHead className="w-full">Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Docs</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Language</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((document) => (
            <Row key={document.id} document={document} />
          ))}
        </TableBody>
      </CossTable>
    </div>
  )
}

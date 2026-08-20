import {
  Table as CossTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton as Bone } from "@/components/ui/skeleton"
import { useLoadingSound } from "@/lib/sounds"
import { PAGE_SIZE } from "./utils"

/** Table-shaped placeholder while the document list loads. */
export default function Skeleton() {
  useLoadingSound()

  return (
    <div
      aria-busy="true"
      aria-label="Loading corpus documents"
      className="flex flex-col gap-4"
      role="status"
    >
      <div className="flex items-center gap-3">
        <Bone className="h-9 w-full max-w-xs" />
        <Bone className="h-9 w-24" />
        <Bone className="h-9 w-28" />
        <Bone className="h-9 w-28" />
      </div>
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
            {Array.from({ length: PAGE_SIZE }, (_, i) => (
              <TableRow key={i}>
                <TableCell className="w-full max-w-0">
                  <div className="flex items-center gap-3">
                    <Bone className="size-8 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1">
                      <Bone className="h-4 w-44" />
                      <Bone className="mt-1 h-3 w-32" />
                    </div>
                  </div>
                </TableCell>
                {/* Widths chosen near the loaded column sizes so the table
                    doesn't jump when data arrives. */}
                <TableCell>
                  <Bone className="h-4.5 w-14" />
                </TableCell>
                <TableCell>
                  <Bone className="h-3 w-10" />
                </TableCell>
                <TableCell>
                  <Bone className="h-3 w-14" />
                </TableCell>
                <TableCell>
                  <Bone className="h-3 w-16" />
                </TableCell>
                <TableCell>
                  <Bone className="h-3 w-20" />
                </TableCell>
                <TableCell>
                  <div className="flex w-8 justify-end">
                    <Bone className="size-4" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </CossTable>
      </div>
    </div>
  )
}

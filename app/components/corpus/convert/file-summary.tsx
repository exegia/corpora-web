import { FileText, RotateCw, X } from "lucide-react"
import { Link } from "react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardPanel } from "@/components/ui/card"
import { formatBytes } from "@/lib/corpus-convert"
import { formatDate } from "@/lib/format"
import type { FileSummaryProps } from "./types"
import { extensionBadge, isDone } from "./utils"

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  )
}

function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

/** The source-file card under the logs: status, actions, metadata grid. */
export default function FileSummary({
  entry,
  documentId,
  onRetry,
  onDismiss,
}: FileSummaryProps) {
  const done = isDone(entry)
  const failed = entry.status === "error"

  return (
    <Card>
      <CardPanel className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
          >
            <FileText className="size-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-sm">{entry.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge size="sm" variant="secondary">
                {extensionBadge(entry)}
              </Badge>
              <span
                className={`flex items-center gap-1.5 text-xs ${
                  failed ? "text-destructive" : "text-warning-foreground"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-current"
                />
                {failed ? "Failed" : done ? "Converted" : "Converting"}
              </span>
              {done && documentId && (
                <Button
                  render={<Link to={`/corpus/${documentId}`} viewTransition />}
                  size="sm"
                  variant="outline"
                >
                  View corpus
                </Button>
              )}
              {failed && (
                <Button
                  className="text-destructive-foreground"
                  onClick={onRetry}
                  size="sm"
                  type="button"
                  variant="destructive-outline"
                >
                  <RotateCw /> Retry
                </Button>
              )}
            </div>
          </div>
          <Button
            aria-label="Dismiss conversion"
            onClick={onDismiss}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <X />
          </Button>
        </div>
        <dl className="grid grid-cols-2 gap-3 border-t pt-3">
          <Meta label="Size" value={formatBytes(entry.size)} />
          <Meta label="Type" value={entry.type} />
          <Meta label="Source format" value={entry.sourceFormat ?? "—"} />
          <Meta
            label="Last modified"
            value={formatDate(new Date(entry.lastModified).toISOString())}
          />
          <Meta label="Uploaded" value={formatDateTime(entry.uploadedAt)} />
        </dl>
      </CardPanel>
    </Card>
  )
}

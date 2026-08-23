import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { CorpusDocument } from "@/lib/corpus"
import { formatSize } from "../list/utils"
import Panel from "./panel"
import { formatDateTime } from "./utils"
import type { ActivityEvent, VersionEntry } from "./types"

function versionsFor(document: CorpusDocument): VersionEntry[] {
  const versions: VersionEntry[] = []
  if (document.convertedAt) {
    versions.push({
      id: "converted",
      label: "v1.1",
      title: "Converted",
      at: document.convertedAt,
      current: true,
      notes: document.sourceFormat
        ? [`Source format ${document.sourceFormat}`]
        : [],
    })
  }
  versions.push({
    id: "uploaded",
    label: "v1.0",
    title: "Initial upload",
    at: document.uploadedAt,
    current: !document.convertedAt,
    notes: [
      document.filename ? document.filename : "Uploaded to the library",
      document.docsCount
        ? `${document.docsCount.toLocaleString("en-US")} documents imported`
        : null,
    ].filter((note): note is string => Boolean(note)),
  })
  return versions
}

function activityFor(document: CorpusDocument): ActivityEvent[] {
  const events: ActivityEvent[] = []
  if (document.convertedAt) {
    events.push({
      id: "converted",
      title: "Conversion succeeded",
      detail: document.sourceFormat
        ? `${document.sourceFormat} → corpus archive`
        : "Archive ready to browse",
      at: document.convertedAt,
      accent: true,
    })
  }
  events.push({
    id: "uploaded",
    title: "Upload received",
    detail:
      [document.filename, formatSize(document.sizeBytes)]
        .filter((part) => part && part !== "—")
        .join(" · ") || "File stored in the library",
    at: document.uploadedAt,
    accent: !document.convertedAt,
  })
  events.push({
    id: "created",
    title: "Corpus created",
    detail: "Added to the library",
    at: document.uploadedAt,
    accent: false,
  })
  return events
}

function activityTimestamp(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const delta = now.getTime() - then
  const day = 1000 * 60 * 60 * 24
  if (delta < day) return formatDateTime(iso).replace(/.*,\s*/, "")
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function VersionRow({ version }: { version: VersionEntry }) {
  return (
    <li className="relative flex gap-3 pb-6 last:pb-0">
      <span
        aria-hidden="true"
        className={`mt-1.5 size-2 shrink-0 rounded-full ${
          version.current ? "bg-primary" : "bg-muted-foreground/40"
        }`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">{version.label}</span>
            {version.current && (
              <Badge size="sm" variant="outline">
                Current
              </Badge>
            )}
          </div>
          {!version.current && (
            <Button disabled size="sm" type="button" variant="link">
              Restore
            </Button>
          )}
        </div>
        <p className="text-sm">{version.title}</p>
        <p className="text-muted-foreground text-xs">
          {formatDateTime(version.at)}
        </p>
        {version.notes.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1 text-muted-foreground text-sm">
            {version.notes.map((note) => (
              <li key={note}>— {note}</li>
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}

function EventRow({ event }: { event: ActivityEvent }) {
  return (
    <li className="flex items-start gap-3 border-b py-3 last:border-0">
      <span
        aria-hidden="true"
        className={`mt-1.5 size-2 shrink-0 rounded-full ${
          event.accent ? "bg-primary" : "bg-muted-foreground/40"
        }`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="font-medium text-sm">{event.title}</p>
          <time className="shrink-0 text-muted-foreground text-xs">
            {activityTimestamp(event.at)}
          </time>
        </div>
        <p className="text-muted-foreground text-sm">{event.detail}</p>
      </div>
    </li>
  )
}

/** Activity tab: version timeline plus derived lifecycle events. */
export default function Activity({ document }: { document: CorpusDocument }) {
  const versions = versionsFor(document)
  const events = activityFor(document)

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <Panel bodyClassName="ps-4" title="Version history">
        <ol className="relative ms-1 border-s border-border ps-4">
          {versions.map((version) => (
            <VersionRow key={version.id} version={version} />
          ))}
        </ol>
      </Panel>
      <Panel bodyClassName="p-0 px-4" title="Activity">
        <ol>
          {events.map((event) => (
            <EventRow event={event} key={event.id} />
          ))}
        </ol>
      </Panel>
    </div>
  )
}

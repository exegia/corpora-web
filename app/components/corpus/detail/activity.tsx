import { useEffect, useRef, useState } from "react"
import { useFetchers } from "react-router"
import { Blocks } from "@/components/blocks"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toastManager } from "@/compo@/lib/corpus/corpusst"
import type { CorpusArchive, CorpusVersion } from "@/lib/api/methods"
import { fetchCorpusVersions } from "@/lib/api/methods"
import type { CorpusDocument } from "@/lib/corpus"
import { formatSize } from "../list/utils"
import Panel from "./panel"
import { formatDateTime } from "./utils"
import type { ActivityEvent, VersionEntry } from "./types"

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

function actorName(
  actor: VersionEntry["author"] | VersionEntry["approved_by"],
): string | null {
  if (!actor) return null
  const name = actor.name?.trim()
  if (name) return name
  const sub = actor.sub?.trim()
  return sub || null
}

function VersionRow({
  version,
  jobId,
}: {
  version: VersionEntry
  jobId: string | null
}) {
  const author = actorName(version.author)
  const approver = actorName(version.approved_by)
  const canRestore = Boolean(jobId) && !version.current
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
          {!version.current &&
            (canRestore && jobId ? (
              <Blocks.ConfirmDelete
                confirmLabel="Restore version"
                confirmWord="RESTORE"
                description={`This replaces the current archive with ${version.label}. Type RESTORE to confirm.`}
                fields={{ jobId, versionId: version.id }}
                intent="restore-version"
                title={`Restore ${version.label}?`}
                trigger={
                  <Button size="sm" type="button" variant="link" />
                }
                triggerLabel="Restore"
              />
            ) : (
              <Button disabled size="sm" type="button" variant="link">
                Restore
              </Button>
            ))}
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
        {version.files.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1 text-muted-foreground text-sm">
            {version.files.map((file) => (
              <li key={`${file.kind}:${file.path}`}>
                {file.path}
                <span className="ms-2">{file.kind}</span>
              </li>
            ))}
          </ul>
        )}
        {author ? <p className="text-muted-foreground text-sm">{author}</p> : null}
        {approver ? (
          <p className="text-muted-foreground text-sm">Approved by {approver}</p>
        ) : null}
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

function toVersionEntry(row: CorpusVersion): VersionEntry {
  return {
    id: row.id,
    label: row.label,
    title: row.title,
    at: row.at,
    current: row.current,
    notes: row.notes ?? [],
    files: row.files ?? [],
    author: row.author,
    approved_by: row.approved_by,
  }
}

/** Activity tab: version timeline from GET …/versions plus derived lifecycle events. */
export default function Activity({
  document,
  archive,
}: {
  document: CorpusDocument
  archive: CorpusArchive | null
}) {
  const events = activityFor(document)
  const archiveKey = archive ? `${archive.kind}:${archive.key}` : ""
  const jobId = archive?.kind === "job" ? archive.key : null
  const fetchers = useFetchers()
  const restoreFetcher = fetchers.find(
    (fetcher) => fetcher.formData?.get("intent") === "restore-version",
  )
  const restoreGen =
    restoreFetcher?.state === "idle" ? JSON.stringify(restoreFetcher.data ?? null) : ""
  const toastedError = useRef<string | null>(null)
  const [fetchedKey, setFetchedKey] = useState<string | null>(null)
  const [remote, setRemote] = useState<VersionEntry[]>([])

  useEffect(() => {
    if (restoreFetcher?.state !== "idle") return
    const error =
      restoreFetcher.data &&
      typeof restoreFetcher.data === "object" &&
      "ok" in restoreFetcher.data &&
      restoreFetcher.data.ok === false
        ? String(
            (restoreFetcher.data as { error?: string }).error ?? "Restore failed.",
          )
        : null
    if (!error || toastedError.current === error) return
    toastedError.current = error
    toastManager.add({
      type: "error",
      title: "Restore failed",
      description: error,
    })
  }, [restoreFetcher?.state, restoreFetcher?.data])

  useEffect(() => {
    if (!archive) return
    let cancelled = false
    fetchCorpusVersions(archive)
      .then((body) => {
        if (cancelled) return
        setRemote((body.versions ?? []).map(toVersionEntry))
        setFetchedKey(archiveKey)
      })
      .catch(() => {
        if (!cancelled) {
          setRemote([])
          setFetchedKey(archiveKey)
        }
      })
    return () => {
      cancelled = true
    }
  }, [archive, archiveKey, restoreGen])

  const versions = archive
    ? [...remote].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    : []
  const loading = Boolean(archive) && fetchedKey !== archiveKey

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <Panel bodyClassName="ps-4" title="Version history">
        {loading ? (
          <div
            aria-label="Loading version history"
            className="flex flex-col gap-3 py-2"
            role="status"
          >
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-5/6" />
          </div>
        ) : versions.length === 0 ? (
          <p className="text-muted-foreground text-sm">No version history yet.</p>
        ) : (
          <ol className="relative ms-1 border-s border-border ps-4">
            {versions.map((version) => (
              <VersionRow jobId={jobId} key={version.id} version={version} />
            ))}
          </ol>
        )}
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

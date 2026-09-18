import { useEffect, useRef, useState } from "react"
import { useFetchers } from "react-router"
import { Blocks } from "@/components/blocks"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { toastManager } from "@/components/ui/toast"
import CorporaApi, {
  type CorpusArchive,
  type CorpusVersion,
  type CorpusVersionDiff,
} from "@/lib/api"
import type { CorpusDocument } from "@/lib/corpus"
import { formatSize } from "../list/utils"
import Panel from "./panel"
import { formatDateTime } from "./utils"
import type { ActivityEvent, VersionEntry } from "./types"

function activityFor(
  document: CorpusDocument,
  versions: VersionEntry[] = [],
): ActivityEvent[] {
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
  // history.yml's v1.0 row is the authoritative creation event. Keeping the
  // local fallback is useful while no history exists, but showing both would
  // make one upload look like two corpus creations.
  if (!versions.some((version) => version.label === "v1.0")) {
    events.push({
      id: "created",
      title: "Corpus created",
      detail: "Added to the library",
      at: document.uploadedAt,
      accent: false,
    })
  }
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
  compareEnabled,
  selected,
  comparisonDisabled,
  onToggleComparison,
}: {
  version: VersionEntry
  jobId: string | null
  compareEnabled: boolean
  selected: boolean
  comparisonDisabled: boolean
  onToggleComparison: (selected: boolean) => void
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
            {compareEnabled ? (
              <Checkbox
                aria-label={`Select ${version.label} for comparison`}
                checked={selected}
                disabled={comparisonDisabled}
                onCheckedChange={(checked) => onToggleComparison(checked === true)}
              />
            ) : null}
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

function DiffPanel({
  diff,
  loading,
  error,
}: {
  diff: CorpusVersionDiff | null
  loading: boolean
  error: string | null
}) {
  if (loading) {
    return (
      <div aria-label="Loading version comparison" className="mt-4 flex flex-col gap-2" role="status">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-5/6" />
      </div>
    )
  }

  if (error) {
    return (
      <div
        aria-label="Version comparison error"
        className="mt-4 rounded-lg border border-destructive/40 bg-destructive/8 p-3 text-destructive text-sm"
        role="alert"
      >
        Could not compare the selected versions. {error}
      </div>
    )
  }

  if (!diff) return null

  return (
    <div className="mt-4 rounded-lg border bg-muted/20 p-3">
      <h3 className="font-medium text-sm">
        Changes from {diff.from.label} to {diff.to.label}
      </h3>
      {diff.files.length === 0 ? (
        <p className="mt-2 text-muted-foreground text-sm">No file changes.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {diff.files.map((file) => (
            <li className="flex flex-wrap items-baseline gap-x-2 gap-y-1" key={`${file.kind}:${file.path}`}>
              <span className="font-medium capitalize">{file.kind}</span>
              <code>{file.path}</code>
              {(file.before || file.after) && (
                <span className="text-muted-foreground text-xs">
                  {file.before ? `${formatSize(file.before.size)} before` : "New"}{" "}
                  → {file.after ? `${formatSize(file.after.size)} after` : "Removed"}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
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
  const [comparisonIds, setComparisonIds] = useState<string[]>([])
  const [diff, setDiff] = useState<CorpusVersionDiff | null>(null)
  const [diffError, setDiffError] = useState<string | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)

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
    CorporaApi.fetchCorpusVersions(archive)
      .then((body) => {
        if (cancelled) return
        setComparisonIds([])
        setDiff(null)
        setDiffError(null)
        setDiffLoading(false)
        setRemote((body.versions ?? []).map(toVersionEntry))
        setFetchedKey(archiveKey)
      })
      .catch(() => {
        if (!cancelled) {
          setComparisonIds([])
          setDiff(null)
          setDiffError(null)
          setDiffLoading(false)
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
  const events = activityFor(document, versions)
  const selectedVersions = comparisonIds
    .map((id) => versions.find((version) => version.id === id))
    .filter((version): version is VersionEntry => version != null)

  function toggleComparison(id: string, selected: boolean) {
    setComparisonIds((current) => {
      if (selected) {
        if (current.includes(id) || current.length >= 2) return current
        return [...current, id]
      }
      return current.filter((currentId) => currentId !== id)
    })
    setDiff(null)
    setDiffError(null)
  }

  async function compareSelectedVersions() {
    if (archive?.kind !== "job" || selectedVersions.length !== 2) return
    const [from, to] = selectedVersions
    if (!from || !to) return
    setDiffLoading(true)
    setDiff(null)
    setDiffError(null)
    try {
      setDiff(await CorporaApi.fetchCorpusVersionDiff(archive, from.id, to.id))
    } catch (error) {
      setDiffError(error instanceof Error ? error.message : "The comparison failed.")
    } finally {
      setDiffLoading(false)
    }
  }

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
          <>
            {versions.length > 1 && archive?.kind === "job" && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3">
                <div>
                  <p className="font-medium text-sm">Compare versions</p>
                  <p className="text-muted-foreground text-xs">
                    Select two versions to see which archive files changed.
                  </p>
                </div>
                <Button
                  disabled={selectedVersions.length !== 2 || diffLoading}
                  onClick={compareSelectedVersions}
                  size="sm"
                  type="button"
                >
                  Compare
                </Button>
              </div>
            )}
            <ol className="relative ms-1 border-s border-border ps-4">
              {versions.map((version) => (
                <VersionRow
                  compareEnabled={archive?.kind === "job" && versions.length > 1}
                  comparisonDisabled={
                    comparisonIds.length >= 2 && !comparisonIds.includes(version.id)
                  }
                  jobId={jobId}
                  key={version.id}
                  onToggleComparison={(selected) => toggleComparison(version.id, selected)}
                  selected={comparisonIds.includes(version.id)}
                  version={version}
                />
              ))}
            </ol>
            {archive?.kind === "job" && (
              <DiffPanel diff={diff} error={diffError} loading={diffLoading} />
            )}
          </>
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

import { Download, FileArchive, ListTree } from "lucide-react"
import { Suspense } from "react"
import {
  Await,
  NavLink,
  Outlet,
  redirect,
  useLoaderData,
  useLocation,
  useSearchParams,
} from "react-router"
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router"
import { Blocks } from "@/components/blocks"
import { CorpusDetail } from "@/components/corpus/detail"
import type { ExploreTab } from "@/components/corpus/detail/types"
import {
  formatCount,
  parseExploreTab,
  sectionByTitle,
} from "@/components/corpus/detail/utils"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import type { CorpusArchive } from "@/lib/corpora-api"
import {
  CorporaApiError,
  downloadExploreCorpus,
  loadCorpusArchive,
  restoreCorpusVersion,
} from "@/lib/corpora-api"
import { sectionsFromIndex } from "@/lib/corpus-explore"
import { deleteCorpusDocument, getCorpusDocument } from "@/lib/corpus"
import type { CorpusDocument, CorpusSection } from "@/lib/corpus"
import { DataError } from "@/lib/projects"
import { useLoadingSound, useReadySound } from "@/lib/sounds"
import { cn } from "@/lib/utils"

export type CorpusExplorerContext = {
  document: CorpusDocument
  archive: CorpusArchive | null
}

const EXPLORE_TAB_LINKS: {
  label: string
  to: string
  end?: boolean
}[] = [
  { label: "Overview", to: ".", end: true },
  { label: "Documents", to: "documents" },
  { label: "Structure", to: "structure" },
  { label: "Analytics", to: "analytics" },
  { label: "Activity", to: "activity" },
]

/** Map a leftover `?tab=` value onto the nested explorer path. */
function legacyExplorePath(request: Request, documentId: string): string | null {
  const url = new URL(request.url)
  const tabParam = url.searchParams.get("tab")
  if (tabParam === null) return null
  const tab = parseExploreTab(tabParam)
  url.searchParams.delete("tab")
  if (tab !== "documents") url.searchParams.delete("section")
  const pathname =
    tab === "overview" ? `/corpus/${documentId}` : `/corpus/${documentId}/${tab}`
  return `${pathname}${url.search}`
}

function exploreTabFromPath(
  pathname: string,
  documentId: string,
): ExploreTab {
  const prefix = `/corpus/${documentId}`
  if (pathname === prefix || pathname === `${prefix}/`) return "overview"
  if (!pathname.startsWith(`${prefix}/`)) return "overview"
  const segment = pathname.slice(prefix.length + 1).split("/")[0] ?? ""
  return parseExploreTab(segment || null)
}

export function explorerSections(
  document: CorpusDocument,
  archive: CorpusArchive | null,
): CorpusSection[] {
  return document.toc?.length
    ? document.toc
    : archive
      ? sectionsFromIndex(archive.index)
      : []
}

export async function clientLoader({ params, request }: LoaderFunctionArgs) {
  const legacy = legacyExplorePath(request, params.documentId ?? "")
  if (legacy) throw redirect(legacy)
  // Awaited: the breadcrumb reads `document` off loaderData synchronously
  // (components/breadcrumb), and it is one indexed row.
  const document = await getCorpusDocument(params.documentId ?? "")
  // Job (or Hub-import) index is the slow follow-up; defer so the header
  // paints immediately. The breadcrumb only needs `document`.
  const archive = document
    ? loadCorpusArchive(document)
    : Promise.resolve(null)
  return { document, archive }
}

export async function clientAction({ request }: ActionFunctionArgs) {
  const form = await request.formData()
  const intent = String(form.get("intent") ?? "")
  try {
    switch (intent) {
      case "delete-document":
        await deleteCorpusDocument(String(form.get("documentId") ?? ""))
        return redirect("/corpus")
      case "restore-version": {
        const jobId = String(form.get("jobId") ?? "")
        const versionId = String(form.get("versionId") ?? "")
        if (!jobId || !versionId) {
          return { ok: false, error: "Missing version to restore." }
        }
        await restoreCorpusVersion({ kind: "job", key: jobId }, versionId)
        return { ok: true }
      }
      default:
        return { ok: false, error: "Unknown action." }
    }
  } catch (error) {
    if (error instanceof DataError) {
      return { ok: false, error: error.message }
    }
    if (error instanceof CorporaApiError) {
      return { ok: false, error: error.message }
    }
    return { ok: false, error: "Something went wrong. Your change was not saved." }
  }
}

function NotFound() {
  return (
    <Empty className="py-10 md:py-14">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileArchive />
        </EmptyMedia>
        <EmptyTitle>This corpus no longer exists</EmptyTitle>
        <EmptyDescription>
          It may have been deleted. The library lists everything that is still
          available.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function saveDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = window.document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

/**
 * Prefer the live archive (`GET /convert/{job_id}/download` or Hub download).
 * Rows with no reachable job or Hub object fall back to a JSON snapshot.
 */
async function exportDocument(document: CorpusDocument) {
  try {
    const archive = await loadCorpusArchive(document)
    if (archive) {
      const filename =
        document.filename ??
        (archive.kind === "hub" ? archive.key : `${document.name}.corpus`)
      saveDownload(await downloadExploreCorpus(archive), filename)
      return
    }
  } catch {
    // Job expired or unreachable — keep the metadata snapshot.
  }
  saveDownload(
    new Blob([JSON.stringify(document, null, 2)], {
      type: "application/json",
    }),
    `${document.name}.json`,
  )
}

function ArchiveFallback() {
  useLoadingSound()
  return (
    <div
      aria-busy="true"
      aria-label="Loading corpus archive"
      className="grid gap-6 lg:grid-cols-[18rem_1fr]"
      role="status"
    >
      <div className="flex flex-col gap-3 rounded-2xl border p-4">
        <Skeleton className="h-4 w-20" />
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton className="h-8 w-full" key={i} />
        ))}
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

export function EmptySections() {
  return (
    <Empty className="py-10">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ListTree />
        </EmptyMedia>
        <EmptyTitle>No sections yet</EmptyTitle>
        <EmptyDescription>
          No section data was captured for this corpus.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function ExploreTabs() {
  return (
    <nav
      aria-label="Corpus explorer"
      className="relative z-0 flex w-fit items-center justify-center gap-x-0.5 rounded-lg bg-muted p-0.5 text-muted-foreground/72"
    >
      {EXPLORE_TAB_LINKS.map((item) => (
        <NavLink
          className={({ isActive }) =>
            cn(
              "relative flex h-9 shrink-0 grow items-center justify-center whitespace-nowrap rounded-md border border-transparent px-[calc(--spacing(2.5)-1px)] font-medium text-base outline-none transition-[color,background-color,box-shadow] hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring sm:h-8 sm:text-sm",
              isActive
                ? "bg-background text-foreground shadow-sm/5 dark:bg-input"
                : "text-muted-foreground",
            )
          }
          end={item.end}
          key={item.label}
          preventScrollReset
          to={item.to}
          viewTransition
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

function PlayReadySound() {
  useReadySound()
  return null
}

/** One corpus document: details, explorer tabs, and its lifecycle actions. */
export default function CorpusDetailPage() {
  const { document, archive } = useLoaderData<typeof clientLoader>()
  const { pathname } = useLocation()
  const [params] = useSearchParams()

  if (!document) return <NotFound />

  const tab = exploreTabFromPath(pathname, document.id)
  const sectionTitle = params.get("section")
  const tocSection = sectionByTitle(document.toc, sectionTitle)
  const reading =
    tab === "documents" && (tocSection != null || Boolean(sectionTitle))

  return (
    <div className="flex flex-col gap-6">
      <CorpusDetail.Header
        actions={
          <>
            <Blocks.ConfirmDelete
              confirmLabel="Delete corpus"
              description={`This permanently deletes “${document.name}” and its version history from your library. Projects that reference it will show it as unavailable. This cannot be undone.`}
              fields={{ documentId: document.id }}
              intent="delete-document"
              title={`Delete “${document.name}”?`}
            />
            <Button
              onClick={() => exportDocument(document)}
              size="sm"
              type="button"
            >
              <Download /> Export
            </Button>
          </>
        }
        description={
          reading
            ? [
                document.name,
                tocSection?.nodes != null
                  ? `${formatCount(tocSection.nodes)} nodes`
                  : null,
                tocSection?.words != null
                  ? `${formatCount(tocSection.words)} words`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")
            : undefined
        }
        document={document}
        hideMeta={Boolean(reading)}
        tabs={<ExploreTabs />}
        title={reading ? (tocSection?.title ?? sectionTitle ?? undefined) : undefined}
      />

      <Suspense fallback={<ArchiveFallback />}>
        <Await resolve={archive}>
          {(resolved) => (
            <>
              <PlayReadySound />
              <div
                className="flex-1 outline-none animate-tab-panel-enter motion-reduce:animate-none"
                key={tab}
              >
                <Outlet
                  context={
                    { archive: resolved, document } satisfies CorpusExplorerContext
                  }
                />
              </div>
            </>
          )}
        </Await>
      </Suspense>
    </div>
  )
}

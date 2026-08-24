import { Download, FileArchive, ListTree } from "lucide-react"
import { Suspense } from "react"
import { Await, redirect, useLoaderData, useSearchParams } from "react-router"
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router"
import { Blocks } from "@/components/blocks"
import { CorpusDetail } from "@/components/corpus/detail"
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
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs"
import type { CorpusArchive } from "@/lib/corpora-api"
import { downloadExploreCorpus, loadCorpusArchive } from "@/lib/corpora-api"
import { sectionsFromIndex } from "@/lib/corpus-explore"
import { deleteCorpusDocument, getCorpusDocument } from "@/lib/corpus"
import type { CorpusDocument, CorpusSection } from "@/lib/corpus"
import { DataError } from "@/lib/projects"
import { useLoadingSound, useReadySound } from "@/lib/sounds"

export async function clientLoader({ params }: LoaderFunctionArgs) {
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
      default:
        return { ok: false, error: "Unknown action." }
    }
  } catch (error) {
    if (error instanceof DataError) {
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

function EmptySections() {
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

function ExplorerPanels({
  document,
  archive,
  sectionTitle,
  onOpenSection,
  onAnalytics,
}: {
  document: CorpusDocument
  archive: CorpusArchive | null
  sectionTitle: string | null
  onOpenSection: (section: CorpusSection) => void
  onAnalytics: () => void
}) {
  useReadySound()
  const sections = document.toc?.length
    ? document.toc
    : archive
      ? sectionsFromIndex(archive.index)
      : []
  const section = sectionByTitle(sections, sectionTitle)

  return (
    <>
      <TabsPanel value="overview">
        <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
          <CorpusDetail.DetailsCard document={document} />
          {sections.length > 0 ? (
            <CorpusDetail.OverviewTable
              onOpenSection={onOpenSection}
              sections={sections}
            />
          ) : (
            <EmptySections />
          )}
        </div>
      </TabsPanel>

      <TabsPanel value="documents">
        {section ? (
          <CorpusDetail.Reader
            archive={archive}
            key={section.title}
            onViewOccurrences={onAnalytics}
            sectionTitle={section.title}
          />
        ) : (
          <EmptySections />
        )}
      </TabsPanel>

      <TabsPanel value="structure">
        <CorpusDetail.Structure archive={archive} document={document} />
      </TabsPanel>

      <TabsPanel value="analytics">
        <CorpusDetail.Analytics archive={archive} document={document} />
      </TabsPanel>

      <TabsPanel value="activity">
        <CorpusDetail.Activity archive={archive} document={document} />
      </TabsPanel>
    </>
  )
}

/** One corpus document: details, explorer tabs, and its lifecycle actions. */
export default function CorpusDetailPage() {
  const { document, archive } = useLoaderData<typeof clientLoader>()
  const [params, setParams] = useSearchParams()

  if (!document) return <NotFound />

  const tab = parseExploreTab(params.get("tab"))
  const sectionTitle = params.get("section")
  const tocSection = sectionByTitle(document.toc, sectionTitle)
  const reading = tab === "documents" && (tocSection != null || Boolean(sectionTitle))

  function setTab(next: string) {
    const nextParams = new URLSearchParams(params)
    const parsed = parseExploreTab(next)
    if (parsed === "overview") nextParams.delete("tab")
    else nextParams.set("tab", parsed)
    if (parsed !== "documents") nextParams.delete("section")
    setParams(nextParams, { replace: true, preventScrollReset: true })
  }

  function openSection(next: CorpusSection) {
    const nextParams = new URLSearchParams(params)
    nextParams.set("tab", "documents")
    nextParams.set("section", next.title)
    setParams(nextParams, { preventScrollReset: true })
  }

  return (
    <Tabs
      className="flex flex-col gap-6"
      onValueChange={setTab}
      value={tab}
    >
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
        tabs={
          <TabsList>
            <TabsTab value="overview">Overview</TabsTab>
            <TabsTab value="documents">Documents</TabsTab>
            <TabsTab value="structure">Structure</TabsTab>
            <TabsTab value="analytics">Analytics</TabsTab>
            <TabsTab value="activity">Activity</TabsTab>
          </TabsList>
        }
        title={reading ? (tocSection?.title ?? sectionTitle ?? undefined) : undefined}
      />

      <Suspense fallback={<ArchiveFallback />}>
        <Await resolve={archive}>
          {(resolved) => (
            <ExplorerPanels
              archive={resolved}
              document={document}
              onAnalytics={() => setTab("analytics")}
              onOpenSection={openSection}
              sectionTitle={params.get("section")}
            />
          )}
        </Await>
      </Suspense>
    </Tabs>
  )
}

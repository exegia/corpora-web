import { Download, FileArchive, ListTree } from "lucide-react"
import { redirect, useLoaderData, useSearchParams } from "react-router"
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
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs"
import { deleteCorpusDocument, getCorpusDocument } from "@/lib/corpus"
import type { CorpusDocument, CorpusSection } from "@/lib/corpus"
import { DataError } from "@/lib/projects"

export async function clientLoader({ params }: LoaderFunctionArgs) {
  // Awaited: the breadcrumb reads `document` off loaderData synchronously
  // (components/breadcrumb), and it is one indexed row.
  const document = await getCorpusDocument(params.documentId ?? "")
  return { document }
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

/**
 * Honest client stub for Export: a JSON snapshot of the document's metadata.
 * The real backend replaces this with GET /convert/{id}/download (corpora-py).
 */
function exportDocument(document: CorpusDocument) {
  const blob = new Blob([JSON.stringify(document, null, 2)], {
    type: "application/json",
  })
  const url = URL.createObjectURL(blob)
  const anchor = window.document.createElement("a")
  anchor.href = url
  anchor.download = `${document.name}.json`
  anchor.click()
  URL.revokeObjectURL(url)
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

/** One corpus document: details, explorer tabs, and its lifecycle actions. */
export default function CorpusDetailPage() {
  const { document } = useLoaderData<typeof clientLoader>()
  const [params, setParams] = useSearchParams()

  if (!document) return <NotFound />

  const tab = parseExploreTab(params.get("tab"))
  const section = sectionByTitle(document.toc, params.get("section"))
  const reading = tab === "documents" && section

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
                section.nodes != null ? `${formatCount(section.nodes)} nodes` : null,
                `${formatCount(section.words)} words`,
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
        title={reading ? section.title : undefined}
      />

      <TabsPanel value="overview">
        <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
          <CorpusDetail.DetailsCard document={document} />
          {document.toc && document.toc.length > 0 ? (
            <CorpusDetail.OverviewTable
              onOpenSection={openSection}
              sections={document.toc}
            />
          ) : (
            <EmptySections />
          )}
        </div>
      </TabsPanel>

      <TabsPanel value="documents">
        {section ? (
          <CorpusDetail.Reader
            key={section.title}
            onViewOccurrences={() => setTab("analytics")}
            sectionTitle={section.title}
          />
        ) : (
          <EmptySections />
        )}
      </TabsPanel>

      <TabsPanel value="structure">
        <CorpusDetail.Structure document={document} />
      </TabsPanel>

      <TabsPanel value="analytics">
        <CorpusDetail.Analytics document={document} />
      </TabsPanel>

      <TabsPanel value="activity">
        <CorpusDetail.Activity document={document} />
      </TabsPanel>
    </Tabs>
  )
}

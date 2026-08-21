import { Download, FileArchive } from "lucide-react"
import { redirect, useLoaderData } from "react-router"
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router"
import { Blocks } from "@/components/blocks"
import { CorpusDetail } from "@/components/corpus/detail"
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
import type { CorpusDocument } from "@/lib/corpus"
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

/** One corpus document: details, overview sections, and its lifecycle actions. */
export default function CorpusDetailPage() {
  const { document } = useLoaderData<typeof clientLoader>()

  if (!document) return <NotFound />

  return (
    <section className="flex flex-col gap-6">
      <CorpusDetail.Header
        document={document}
        actions={
          <>
            <Blocks.ConfirmDelete
              confirmLabel="Delete corpus"
              description={`This permanently deletes “${document.name}” and its version history from your library. Projects that reference it will show it as unavailable. This cannot be undone.`}
              fields={{ documentId: document.id }}
              intent="delete-document"
              title={`Delete “${document.name}”?`}
              trigger={<Button size="sm" type="button" variant="outline" />}
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
      />

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <CorpusDetail.DetailsCard document={document} />
        <Tabs defaultValue="overview">
          <TabsList variant="underline">
            <TabsTab value="overview">Overview</TabsTab>
            {/* Present but inert until those views are designed. */}
            <TabsTab disabled value="documents">
              Documents
            </TabsTab>
            <TabsTab disabled value="structure">
              Structure
            </TabsTab>
            <TabsTab disabled value="activity">
              Activity
            </TabsTab>
          </TabsList>
          <TabsPanel value="overview">
            {document.toc && document.toc.length > 0 ? (
              <CorpusDetail.OverviewTable sections={document.toc} />
            ) : (
              <p className="py-8 text-center text-muted-foreground text-sm">
                No section data was captured for this corpus.
              </p>
            )}
          </TabsPanel>
        </Tabs>
      </div>
    </section>
  )
}

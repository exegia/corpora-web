import { FileArchive, RefreshCw, Upload } from "lucide-react"
import { Suspense, useRef, useState } from "react"
import { Await, useFetcher, useLoaderData } from "react-router"
import type { ActionFunctionArgs } from "react-router"
import { Convert } from "@/components/corpus/convert"
import { useConversion } from "@/components/corpus/convert/use-conversion"
import { List } from "@/components/corpus/list"
import type { CorpusFilters } from "@/components/corpus/list/types"
import {
  collectLanguages,
  DEFAULT_FILTERS,
  filterDocuments,
  PAGE_SIZE,
  paginate,
} from "@/components/corpus/list/utils"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  createCorpusDocument,
  deleteCorpusDocument,
  listCorpusDocuments,
  uploadCorpusFile,
} from "@/lib/corpus"
import type {
  CorpusCommitInput,
  CorpusDocument,
  CorpusSection,
  CorpusType,
} from "@/lib/corpus"
import { SUPPORTED_EXTENSIONS } from "@/lib/corpora-api"
import { extractCorpusHistory } from "@/lib/corpus-history"
import { useFileUpload } from "@/hooks/use-file-upload"
import { type CorpusSource, DataError } from "@/lib/projects"
import { useReadySound } from "@/lib/sounds"

export async function clientLoader() {
  // Deliberately not awaited (see routes/project.tsx): navigation completes
  // immediately, the upload controls stay interactive, and the list suspends
  // on this promise, showing the skeleton meanwhile.
  const documents = listCorpusDocuments()
  return { documents }
}

function parseCommits(raw: string): CorpusCommitInput[] {
  try {
    const parsed = JSON.parse(raw || "[]")
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (commit): commit is CorpusCommitInput =>
        typeof commit?.sha === "string" && typeof commit?.message === "string",
    )
  } catch {
    return []
  }
}

function parseToc(raw: string): CorpusSection[] | null {
  try {
    const parsed = JSON.parse(raw || "null")
    if (!Array.isArray(parsed)) return null
    const sections = parsed.filter(
      (section): section is CorpusSection =>
        typeof section?.title === "string",
    )
    return sections.length > 0 ? sections : null
  } catch {
    return null
  }
}

export async function clientAction({ request }: ActionFunctionArgs) {
  const form = await request.formData()
  const intent = String(form.get("intent") ?? "")
  try {
    switch (intent) {
      case "create-document":
        await createCorpusDocument({
          name: String(form.get("name") ?? ""),
          source: String(form.get("source") ?? "upload") as CorpusSource,
          path: String(form.get("path") ?? ""),
          filename: String(form.get("filename") ?? "") || null,
          commits: parseCommits(String(form.get("commits") ?? "[]")),
        })
        return { ok: true, intent }
      case "convert-document": {
        // The terminal write of a successful conversion (use-conversion):
        // the only place conversion metadata enters the database.
        const number = (name: string) => {
          const value = Number(form.get(name))
          return Number.isFinite(value) && value > 0 ? value : null
        }
        const created = await createCorpusDocument({
          name: String(form.get("name") ?? ""),
          source: "upload",
          path: String(form.get("path") ?? ""),
          filename: String(form.get("filename") ?? "") || null,
          corpusType:
            (String(form.get("corpusType") ?? "") as CorpusType) || null,
          sourceFormat: String(form.get("sourceFormat") ?? "") || null,
          language: String(form.get("language") ?? "") || null,
          description: String(form.get("description") ?? "") || null,
          toc: parseToc(String(form.get("toc") ?? "")),
          sizeBytes: number("sizeBytes"),
          nodes: number("nodes"),
          status: "converted",
          convertedAt: String(form.get("convertedAt") ?? "") || null,
          commits: parseCommits(String(form.get("commits") ?? "[]")),
        })
        return { ok: true, intent, documentId: created.id }
      }
      case "delete-document":
        await deleteCorpusDocument(String(form.get("documentId") ?? ""))
        return { ok: true, intent }
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

function DocumentList({ documents }: { documents: CorpusDocument[] }) {
  useReadySound()
  // Filter and page state lives here, under <Await>: the resolved component
  // stays mounted across revalidations, so a conversion landing a new row
  // never resets the filters.
  const [filters, setFilters] = useState<CorpusFilters>(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)

  if (documents.length === 0) {
    return (
      <Empty className="py-10 md:py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileArchive />
          </EmptyMedia>
          <EmptyTitle>The corpus library is empty</EmptyTitle>
          <EmptyDescription>
            Upload a .corpus document or convert a source file to get started.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const filtered = filterDocuments(documents, filters)
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const visible = paginate(filtered, current)

  return (
    <div className="flex flex-col gap-4">
      <List.Toolbar
        filters={filters}
        languages={collectLanguages(documents)}
        onFiltersChange={(next) => {
          setFilters(next)
          setPage(1)
        }}
        total={filtered.length}
      />
      {filtered.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground text-sm">
          No corpuses match the current filters.
        </p>
      ) : (
        <>
          <List.Table documents={visible} />
          <List.Footer
            end={(current - 1) * PAGE_SIZE + visible.length}
            onPageChange={setPage}
            page={current}
            pageCount={pageCount}
            start={(current - 1) * PAGE_SIZE + 1}
            total={filtered.length}
          />
        </>
      )}
    </div>
  )
}

/**
 * The corpus library (003): upload .corpus documents or convert source files
 * (text-fabric XML, TEI) into them. Uploads carry the version history read
 * from the archive's nested .git; projects import their corpus from here.
 */
export default function Corpus() {
  const { documents } = useLoaderData<typeof clientLoader>()
  const attachFetcher = useFetcher<{ ok: boolean; error?: string }>()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const busy = uploading || attachFetcher.state !== "idle"

  const conversion = useConversion()
  const [, convertPicker] = useFileUpload({
    accept: SUPPORTED_EXTENSIONS.join(","),
    onFilesAdded: (added) => {
      const file = added[0]?.file
      if (file instanceof File) {
        setUploadError(null)
        conversion.start(file)
      }
    },
    onError: (errors) => setUploadError(errors[0] ?? null),
  })

  async function handleFile(file: File) {
    setUploading(true)
    setUploadError(null)
    try {
      // History first: an unreadable archive fails before anything is stored.
      const history = await extractCorpusHistory(file)
      const path = await uploadCorpusFile(file)
      attachFetcher.submit(
        {
          intent: "create-document",
          name: file.name.replace(/\.corpus$/, ""),
          source: "upload",
          path,
          filename: file.name,
          commits: JSON.stringify(history ?? []),
        },
        { method: "post" },
      )
    } catch (error) {
      setUploadError(
        error instanceof DataError
          ? error.message
          : "Something went wrong while uploading the corpus.",
      )
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const actionError =
    attachFetcher.data?.ok === false ? attachFetcher.data.error : null

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Corpus</h1>
          <p className="text-muted-foreground mt-2">
            The documents your projects publish — upload a .corpus file or
            convert a source document. Projects import their corpus from this
            library.
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          {conversion.entry && (
            <Convert.StatusPill
              documentId={conversion.documentId}
              entry={conversion.entry}
              onOpen={conversion.openDrawer}
            />
          )}
          <input
            {...convertPicker.getInputProps({
              "aria-label": "Convert source file",
            })}
            className="sr-only"
          />
          <Button
            type="button"
            variant="outline"
            disabled={conversion.running}
            onClick={convertPicker.openFileDialog}
          >
            <RefreshCw /> Convert
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".corpus"
            className="sr-only"
            aria-label="Upload .corpus file"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              if (file) void handleFile(file)
            }}
          />
          <Button
            type="button"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload /> {uploading ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </header>
      {conversion.entry && (
        <Convert.Drawer
          documentId={conversion.documentId}
          entry={conversion.entry}
          onDismiss={conversion.dismiss}
          onOpenChange={(open) =>
            open ? conversion.openDrawer() : conversion.closeDrawer()
          }
          onRetry={conversion.retry}
          open={conversion.drawerOpen}
        />
      )}
      {(uploadError || actionError) && (
        <p role="alert" className="text-destructive text-sm">
          {uploadError ?? actionError}
        </p>
      )}

      <Suspense fallback={<List.Skeleton />}>
        <Await resolve={documents}>
          {(resolved) => <DocumentList documents={resolved} />}
        </Await>
      </Suspense>
    </section>
  )
}

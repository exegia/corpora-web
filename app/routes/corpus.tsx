import { FileArchive, Upload } from "lucide-react"
import { Suspense, useRef, useState } from "react"
import { Await, useFetcher, useLoaderData } from "react-router"
import type { ActionFunctionArgs } from "react-router"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { Documents } from "@/components/corpus"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  createCorpusDocument,
  deleteCorpusDocument,
  listCorpusDocuments,
  uploadCorpusFile,
} from "@/lib/corpus"
import type { CorpusCommitInput, CorpusDocument } from "@/lib/corpus"
import {
  extractCorpusHistory,
  fetchHuggingFaceHistory,
} from "@/lib/corpus-history"
import { type CorpusSource, DataError } from "@/lib/projects"
import { useLoadingSound, useReadySound } from "@/lib/sounds"

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

function DocumentListSkeleton() {
  useLoadingSound()

  return (
    <div aria-busy="true" aria-label="Loading corpus documents" role="status">
      <ul className="flex flex-col gap-6">
        {Array.from({ length: 3 }, (_, i) => (
          <Card className="gap-4 p-6" key={i} render={<li />}>
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 shrink-0 rounded-lg" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-8 w-16 shrink-0" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </Card>
        ))}
      </ul>
    </div>
  )
}

function DocumentList({ documents }: { documents: CorpusDocument[] }) {
  useReadySound()

  if (documents.length === 0) {
    return (
      <Empty className="py-10 md:py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileArchive />
          </EmptyMedia>
          <EmptyTitle>The corpus library is empty</EmptyTitle>
          <EmptyDescription>
            Upload your first .corpus document or add a Hugging Face corpus.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ul className="flex flex-col gap-6">
      {documents.map((document) => (
        <DocumentEntry key={document.id} document={document} />
      ))}
    </ul>
  )
}

function DocumentEntry({ document }: { document: CorpusDocument }) {
  return (
    <li className="flex flex-col gap-3">
      <Documents.Card
        document={document}
        actions={
          <ConfirmDeleteDialog
            confirmLabel="Delete corpus"
            description={`This permanently deletes “${document.name}” and its version history from your library. Projects that reference it will show it as unavailable. This cannot be undone.`}
            fields={{ documentId: document.id }}
            intent="delete-document"
            title={`Delete “${document.name}”?`}
            trigger={<Button size="sm" type="button" variant="ghost" />}
          />
        }
      />
      <div className="ps-1">
        <Documents.History commits={document.commits} />
      </div>
    </li>
  )
}

/**
 * The corpus library (003): upload .corpus documents — book, bible,
 * commentary, lexicon — or register Hugging Face corpora. Uploads carry the
 * version history read from the archive's nested .git; projects import their
 * corpus from here.
 */
export default function Corpus() {
  const { documents } = useLoaderData<typeof clientLoader>()
  const attachFetcher = useFetcher<{ ok: boolean; error?: string }>()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [hfUrl, setHfUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const busy = uploading || attachFetcher.state !== "idle"

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

  async function handleHuggingFace(url: string) {
    setUploading(true)
    setUploadError(null)
    try {
      // Best effort — a private or unreachable repo still registers, just
      // without a version history.
      const history = await fetchHuggingFaceHistory(url)
      attachFetcher.submit(
        {
          intent: "create-document",
          name: url.split("/").filter(Boolean).slice(-2).join("/"),
          source: "huggingface",
          path: url,
          filename: "",
          commits: JSON.stringify(history ?? []),
        },
        { method: "post" },
      )
      setHfUrl("")
    } finally {
      setUploading(false)
    }
  }

  const actionError =
    attachFetcher.data?.ok === false ? attachFetcher.data.error : null

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-2xl font-bold">Corpus</h1>
        <p className="text-muted-foreground mt-2">
          The documents your projects publish — upload a .corpus file or point
          to a corpus on Hugging Face. Projects import their corpus from this
          library.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
          variant="outline"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload /> {uploading ? "Uploading…" : "Upload .corpus"}
        </Button>
        <span className="text-muted-foreground text-sm">or</span>
        <form
          className="flex flex-1 items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void handleHuggingFace(hfUrl)
          }}
        >
          <Input
            aria-label="Hugging Face URL"
            placeholder="https://huggingface.co/datasets/…"
            value={hfUrl}
            onChange={(event) => setHfUrl(event.currentTarget.value)}
          />
          <Button type="submit" variant="outline" disabled={busy || !hfUrl.trim()}>
            Add
          </Button>
        </form>
      </div>
      {(uploadError || actionError) && (
        <p role="alert" className="text-destructive text-sm">
          {uploadError ?? actionError}
        </p>
      )}

      <Suspense fallback={<DocumentListSkeleton />}>
        <Await resolve={documents}>
          {(resolved) => <DocumentList documents={resolved} />}
        </Await>
      </Suspense>
    </section>
  )
}

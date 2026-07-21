import { FileArchive, Upload } from "lucide-react"
import { useRef, useState } from "react"
import { useFetcher, useLoaderData } from "react-router"
import type { ActionFunctionArgs } from "react-router"
import {
  CommitHistory,
  CorpusDocumentCard,
} from "@/components/corpus/corpus-document-card"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
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

export async function clientLoader() {
  return { documents: await listCorpusDocuments() }
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

function DocumentEntry({ document }: { document: CorpusDocument }) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>()
  const [confirming, setConfirming] = useState(false)
  const busy = fetcher.state !== "idle"

  return (
    <li className="flex flex-col gap-3">
      <CorpusDocumentCard
        document={document}
        actions={
          confirming ? (
            <fetcher.Form method="post" onSubmit={() => setConfirming(false)}>
              <input type="hidden" name="intent" value="delete-document" />
              <input type="hidden" name="documentId" value={document.id} />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setConfirming(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" variant="destructive" disabled={busy}>
                Delete corpus
              </Button>
            </fetcher.Form>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setConfirming(true)}
            >
              Delete
            </Button>
          )
        }
      />
      {fetcher.data?.ok === false && fetcher.data.error && (
        <p role="alert" className="text-destructive text-sm">
          {fetcher.data.error}
        </p>
      )}
      <div className="ps-1">
        <CommitHistory commits={document.commits} />
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

      {documents.length === 0 ? (
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
      ) : (
        <ul className="flex flex-col gap-6">
          {documents.map((document) => (
            <DocumentEntry key={document.id} document={document} />
          ))}
        </ul>
      )}
    </section>
  )
}

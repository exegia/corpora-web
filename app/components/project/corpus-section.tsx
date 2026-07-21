import { FileArchive, GitCommitHorizontal, Upload } from "lucide-react"
import { useRef, useState } from "react"
import { useFetcher } from "react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { extractCorpusHistory } from "@/lib/corpus-history"
import { uploadCorpusFile } from "@/lib/corpus"
import { formatDate, formatRelativeTime } from "@/lib/format"
import type { CorpusCommit, ProjectCorpus } from "@/lib/projects"
import { DataError } from "@/lib/projects"

function CommitRow({ commit }: { commit: CorpusCommit }) {
  const summary = commit.message.split("\n")[0]
  const where = [commit.branch, commit.sha.slice(0, 7)].filter(Boolean).join(" @ ")
  return (
    <li className="flex items-start gap-3 py-2">
      <GitCommitHorizontal
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
      />
      <div className="min-w-0">
        <p className="truncate font-medium text-sm">{summary}</p>
        <p className="truncate text-muted-foreground text-xs">
          {[
            commit.authorName ?? commit.authorEmail ?? "Unknown author",
            commit.committedAt ? formatRelativeTime(commit.committedAt) : null,
            where,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </li>
  )
}

export interface CorpusSectionProps {
  projectId: string
  corpus: ProjectCorpus | null
  commits: CorpusCommit[]
  readOnly: boolean
}

/**
 * The project's own corpus (003): the uploaded .corpus document or a Hugging
 * Face URL. On upload, the archive's nested .git is read in the browser and
 * its history is stored as the corpus version history. A later release moves
 * this to the Corpus route and this section imports from there.
 */
export function CorpusSection({
  projectId,
  corpus,
  commits,
  readOnly,
}: CorpusSectionProps) {
  const attachFetcher = useFetcher<{ ok: boolean; error?: string }>()
  const detachFetcher = useFetcher<{ ok: boolean; error?: string }>()
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
      const path = await uploadCorpusFile(projectId, file)
      attachFetcher.submit(
        {
          intent: "attach-corpus",
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

  if (!corpus) {
    return (
      <div className="flex flex-col gap-3">
        <Empty className="py-8 md:py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileArchive />
            </EmptyMedia>
            <EmptyTitle>No corpus attached</EmptyTitle>
            <EmptyDescription>
              Upload the project's .corpus document — book, bible, commentary,
              lexicon — or point to it on Hugging Face.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
        {!readOnly && (
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
                attachFetcher.submit(
                  {
                    intent: "attach-corpus",
                    source: "huggingface",
                    path: hfUrl,
                    filename: "",
                    commits: "[]",
                  },
                  { method: "post" },
                )
              }}
            >
              <Input
                aria-label="Hugging Face URL"
                placeholder="https://huggingface.co/datasets/…"
                value={hfUrl}
                onChange={(event) => setHfUrl(event.currentTarget.value)}
              />
              <Button type="submit" variant="outline" disabled={busy || !hfUrl.trim()}>
                Attach
              </Button>
            </form>
          </div>
        )}
        {(uploadError || actionError) && (
          <p role="alert" className="text-destructive text-sm">
            {uploadError ?? actionError}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
        <div className="flex min-w-0 items-center gap-3">
          <FileArchive aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate font-medium text-sm">
              {corpus.source === "huggingface" ? (
                <a
                  href={corpus.path}
                  target="_blank"
                  rel="noreferrer"
                  className="underline-offset-2 hover:underline"
                >
                  {corpus.path}
                </a>
              ) : (
                corpus.filename ?? corpus.path
              )}
            </p>
            <p className="truncate text-muted-foreground text-xs">
              {corpus.source === "huggingface" ? "Hugging Face" : "Uploaded file"}
              {corpus.uploadedAt && ` · attached ${formatDate(corpus.uploadedAt)}`}
            </p>
          </div>
        </div>
        {!readOnly && (
          <detachFetcher.Form method="post" className="shrink-0">
            <input type="hidden" name="intent" value="detach-corpus" />
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              disabled={detachFetcher.state !== "idle"}
            >
              Remove
            </Button>
          </detachFetcher.Form>
        )}
      </div>
      {detachFetcher.data?.ok === false && detachFetcher.data.error && (
        <p role="alert" className="text-destructive text-sm">
          {detachFetcher.data.error}
        </p>
      )}

      <div>
        <h3 className="flex items-center gap-2 font-medium text-sm">
          Version history
          {commits.length > 0 && <Badge variant="secondary">{commits.length}</Badge>}
        </h3>
        {commits.length === 0 ? (
          <p className="py-2 text-muted-foreground text-sm">
            No version history — the corpus carries no .git directory
            {corpus.source === "huggingface" && " (Hugging Face corpora are not inspected yet)"}
            .
          </p>
        ) : (
          <ul className="divide-y">
            {commits.map((commit) => (
              <CommitRow key={commit.id} commit={commit} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

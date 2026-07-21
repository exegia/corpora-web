import { FileArchive } from "lucide-react"
import { useState } from "react"
import { Link, useFetcher } from "react-router"
import {
  CommitHistory,
  CorpusDocumentCard,
} from "@/components/corpus/corpus-document-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import type { CorpusDocument } from "@/lib/corpus"
import { formatRelativeTime } from "@/lib/format"
import type { CorpusCommit, ProjectCorpus } from "@/lib/projects"

function ImportOptionRow({
  document,
  attachedId,
}: {
  document: CorpusDocument
  attachedId: string | null
}) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>()
  const busy = fetcher.state !== "idle"
  const attached = document.id === attachedId

  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="truncate font-medium text-sm">{document.name}</p>
        <p className="truncate text-muted-foreground text-xs">
          {[
            document.source === "huggingface" ? "Hugging Face" : "Uploaded file",
            document.commits.length > 0
              ? `${document.commits.length} commits`
              : null,
            formatRelativeTime(document.uploadedAt),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {fetcher.data?.ok === false && fetcher.data.error && (
          <p role="alert" className="text-destructive text-xs">
            {fetcher.data.error}
          </p>
        )}
      </div>
      {attached ? (
        <Badge variant="secondary">Imported</Badge>
      ) : (
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="attach-corpus" />
          <input type="hidden" name="documentId" value={document.id} />
          <Button type="submit" size="sm" variant="outline" disabled={busy}>
            Import
          </Button>
        </fetcher.Form>
      )}
    </li>
  )
}

function ImportCorpusDialog({
  documents,
  attachedId,
  disabled,
}: {
  documents: CorpusDocument[]
  attachedId: string | null
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size="sm" variant="outline" disabled={disabled} />}
      >
        Import corpus
      </DialogTrigger>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Import a corpus</DialogTitle>
          <DialogDescription>
            Pick the document this project publishes from the corpus library.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          {documents.length === 0 ? (
            <p className="py-4 text-muted-foreground text-sm">
              The corpus library is empty. Upload a .corpus document on the{" "}
              <Link to="/corpus" className="underline underline-offset-2">
                Corpus
              </Link>{" "}
              page first.
            </p>
          ) : (
            <ul className="divide-y">
              {documents.map((document) => (
                <ImportOptionRow
                  key={document.id}
                  document={document}
                  attachedId={attachedId}
                />
              ))}
            </ul>
          )}
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  )
}

export interface CorpusSectionProps {
  corpus: ProjectCorpus | null
  commits: CorpusCommit[]
  documents: CorpusDocument[]
  readOnly: boolean
}

/**
 * The project's corpus (003): imported from the corpus library, where the
 * .corpus documents are uploaded and their version history lives. Removing
 * here only detaches — the document stays in the library.
 */
export function CorpusSection({
  corpus,
  commits,
  documents,
  readOnly,
}: CorpusSectionProps) {
  const detachFetcher = useFetcher<{ ok: boolean; error?: string }>()

  if (!corpus) {
    return (
      <Empty className="py-8 md:py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileArchive />
          </EmptyMedia>
          <EmptyTitle>No corpus attached</EmptyTitle>
          <EmptyDescription>
            Import the document this project publishes from the corpus library.
          </EmptyDescription>
        </EmptyHeader>
        {!readOnly && (
          <EmptyContent>
            <ImportCorpusDialog documents={documents} attachedId={null} />
          </EmptyContent>
        )}
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <CorpusDocumentCard
        document={corpus}
        actions={
          !readOnly && (
            <>
              <ImportCorpusDialog
                documents={documents}
                attachedId={corpus.id}
                disabled={readOnly}
              />
              <detachFetcher.Form method="post">
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
            </>
          )
        }
      />
      {detachFetcher.data?.ok === false && detachFetcher.data.error && (
        <p role="alert" className="text-destructive text-sm">
          {detachFetcher.data.error}
        </p>
      )}
      <CommitHistory commits={commits} />
    </div>
  )
}

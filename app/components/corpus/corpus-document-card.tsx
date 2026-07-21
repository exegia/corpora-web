import { FileArchive, GitCommitHorizontal } from "lucide-react"
import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatRelativeTime } from "@/lib/format"
import type { CorpusCommit, ProjectCorpus } from "@/lib/projects"

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

/** The corpus commit log, newest first (change · who · when · where). */
export function CommitHistory({ commits }: { commits: CorpusCommit[] }) {
  return (
    <div>
      <h3 className="flex items-center gap-2 font-medium text-sm">
        Version history
        {commits.length > 0 && <Badge variant="secondary">{commits.length}</Badge>}
      </h3>
      {commits.length === 0 ? (
        <p className="py-2 text-muted-foreground text-sm">
          No version history — the corpus carries no .git directory.
        </p>
      ) : (
        <ul className="divide-y">
          {commits.map((commit) => (
            <CommitRow key={commit.id} commit={commit} />
          ))}
        </ul>
      )}
    </div>
  )
}

export interface CorpusDocumentCardProps {
  document: Pick<
    ProjectCorpus,
    "name" | "source" | "path" | "filename" | "uploadedAt"
  >
  /** Action controls rendered on the card's trailing edge. */
  actions?: ReactNode
}

/** One corpus document: leading icon, name, source + date meta. */
export function CorpusDocumentCard({ document, actions }: CorpusDocumentCardProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="flex min-w-0 items-center gap-3">
        <FileArchive
          aria-hidden="true"
          className="size-5 shrink-0 text-muted-foreground"
        />
        <div className="min-w-0">
          <p className="truncate font-medium text-sm">
            {document.source === "huggingface" ? (
              <a
                href={document.path}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 hover:underline"
              >
                {document.name}
              </a>
            ) : (
              document.name
            )}
          </p>
          <p className="truncate text-muted-foreground text-xs">
            {document.source === "huggingface" ? "Hugging Face" : "Uploaded file"}
            {document.uploadedAt && ` · added ${formatDate(document.uploadedAt)}`}
          </p>
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </div>
  )
}

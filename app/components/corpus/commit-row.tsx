import { GitCommitHorizontal } from "lucide-react"
import type { CommitRowProps } from "@/components/corpus/types"
import { formatRelativeTime } from "@/lib/format"

/** One commit in the history: change · who · when · where. */
export default function CommitRow({ commit }: CommitRowProps) {
    const summary = commit.message.split("\n")[0]
    const where = [commit.branch, commit.sha.slice(0, 7)].filter(Boolean).join(" @ ")

    return (
        <li className="flex items-start gap-3 py-2">
            <GitCommitHorizontal aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
                <p className="truncate text-sm font-medium">{summary}</p>
                <p className="truncate text-xs text-muted-foreground">
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

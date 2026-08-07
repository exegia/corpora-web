import { Badge } from "@/components/ui/badge"
import CommitRow from "@/components/corpus/commit-row"
import type { HistoryProps } from "@/components/corpus/types"

/** The corpus commit log, newest first (change · who · when · where). */
export default function History({ commits }: HistoryProps) {
    return (
        <div>
            <h3 className="flex items-center gap-2 text-sm font-medium">
                Version history
                {commits.length > 0 && <Badge variant="secondary">{commits.length}</Badge>}
            </h3>
            {commits.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">
                    No version history — the corpus carries no .git directory.
                </p>
            ) : (
                <ul className="divide-y">
                    {commits.map(commit => (
                        <CommitRow key={commit.id} commit={commit} />
                    ))}
                </ul>
            )}
        </div>
    )
}

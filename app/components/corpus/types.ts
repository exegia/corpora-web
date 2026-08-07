import type { ReactNode } from "react"
import type { CorpusCommit, ProjectCorpus } from "@/lib/projects"

export interface CommitRowProps {
    commit: CorpusCommit
}

export interface HistoryProps {
    commits: CorpusCommit[]
}

export interface CardProps {
    document: Pick<ProjectCorpus, "name" | "source" | "path" | "filename" | "uploadedAt">
    /** Action controls rendered on the card's trailing edge. */
    actions?: ReactNode
}

import type { CorpusDocument } from "@/lib/corpus"
import type { CorpusCommit, CorpusLink, CorpusOption, ProjectCorpus } from "@/lib/projects"

export interface SectionProps {
    corpus: ProjectCorpus | null
    commits: CorpusCommit[]
    documents: CorpusDocument[]
    readOnly: boolean
}

export interface ImportSheetProps {
    documents: CorpusDocument[]
    attachedId: string | null
    disabled?: boolean
}

export interface ImportRowProps {
    document: CorpusDocument
    attachedId: string | null
}

export interface ListProps {
    corpora: CorpusLink[]
    readOnly: boolean
}

export interface ListRowProps {
    link: CorpusLink
    readOnly: boolean
}

export interface LinkPickerProps {
    options: CorpusOption[]
    disabled?: boolean
}

export interface LinkRowProps {
    option: CorpusOption
}

import type { IAiScope } from "@exegia/corpora-ui"
import type { CorpusPassage } from "@/lib/api"

export interface ReaderScope {
    corpusId: string
    location: string
    text: string
    scope: IAiScope
}

export interface ReaderSelection extends ReaderScope {
    wordCount: number
}

export interface SelectedPassage {
    passage: CorpusPassage
    index: number
}

export interface ChatState {
    sections: ReaderScope[]
    active: number
    location: { corpusId: string; ref: string } | null
}

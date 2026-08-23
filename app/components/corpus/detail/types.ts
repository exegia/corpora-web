import type { ReactNode } from "react"
import type { CorpusDocument, CorpusSection } from "@/lib/corpus"

export interface HeaderProps {
  document: CorpusDocument
  /** Delete / Export buttons, right-aligned. */
  actions?: ReactNode
}

export interface DetailsCardProps {
  document: CorpusDocument
}

export interface OverviewTableProps {
  sections: CorpusSection[]
}

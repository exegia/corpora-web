import type { ReactNode } from "react"
import type { CorpusDocument } from "@/lib/corpus"
import type { FabricatedSection } from "@/lib/corpus-convert"

export interface HeaderProps {
  document: CorpusDocument
  /** Delete / Export buttons, right-aligned. */
  actions?: ReactNode
}

export interface DetailsCardProps {
  document: CorpusDocument
}

export interface OverviewTableProps {
  sections: FabricatedSection[]
}

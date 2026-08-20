import type { CorpusDocument, CorpusType } from "@/lib/corpus"

export type DateFilter = "any" | "7d" | "30d" | "year"

export interface CorpusFilters {
  query: string
  type: CorpusType | "all"
  date: DateFilter
  language: string | "all"
}

export interface ToolbarProps {
  filters: CorpusFilters
  onFiltersChange: (filters: CorpusFilters) => void
  /** Languages present in the library, for the Language filter. */
  languages: string[]
  /** Total documents after filtering. */
  total: number
}

export interface RowProps {
  document: CorpusDocument
}

export interface TableProps {
  documents: CorpusDocument[]
}

export interface FooterProps {
  page: number
  pageCount: number
  total: number
  /** 1-based range of the visible slice, e.g. "Showing 1–6 of 12". */
  start: number
  end: number
  onPageChange: (page: number) => void
}

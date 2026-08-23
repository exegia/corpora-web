import type { ReactNode } from "react"
import type { CorpusDocument, CorpusSection } from "@/lib/corpus"

export type ExploreTab =
  | "overview"
  | "documents"
  | "structure"
  | "analytics"
  | "activity"

export interface HeaderProps {
  document: CorpusDocument
  /** Delete / Export buttons, right-aligned. */
  actions?: ReactNode
  /** Segmented explorer tabs, sits with the actions. */
  tabs?: ReactNode
  /** Overrides the document name (reader uses the section title). */
  title?: string
  /** Overrides the document description. */
  description?: string
  /** Hide format / status / licence when the reader supplies its own meta. */
  hideMeta?: boolean
}

export interface DetailsCardProps {
  document: CorpusDocument
}

export interface OverviewTableProps {
  sections: CorpusSection[]
  onOpenSection?: (section: CorpusSection) => void
}

export interface NodeTypeStat {
  type: string
  count: number
  avgSlots: number
  pct: number
  slotType?: boolean
}

export interface StructureNode {
  id: string
  type: string
  label: string
  /** Direct children of this node, not a corpus-wide type total. */
  childCount: number
  slotType?: boolean
  children?: StructureNode[]
}

export interface Lemma {
  form: string
  lemma: string
  gloss: string
  pos: string
  posCode: string
  case: string
  caseCode: string
  gender: string
  genderCode: string
  number: string
  numberCode: string
  node: number
  occurrences: number
  occurrencesInSection: number
  context: string[]
}

export interface ReaderQuestion {
  id: string
  title: string
}

export interface ReaderPassage {
  n: number
  text: string
}

export interface ReaderArticle {
  heading: string
  subtitle: string
  passages: ReaderPassage[]
}

export interface ReaderDocument {
  questions: ReaderQuestion[]
  defaultQuestionId: string
  articles: Record<string, ReaderArticle>
}

export interface VersionEntry {
  id: string
  label: string
  title: string
  at: string
  current: boolean
  notes: string[]
}

export interface ActivityEvent {
  id: string
  title: string
  detail: string
  at: string
  accent: boolean
}

export interface PanelProps {
  title?: string
  children: ReactNode
  className?: string
  bodyClassName?: string
}

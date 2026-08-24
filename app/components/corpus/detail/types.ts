import type { ReactNode } from "react"
import type { CorpusVersionActor, CorpusVersionFile } from "@/lib/corpora-api"
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
  /** Direct children of this node. Null when the count is not known yet. */
  childCount: number | null
  slotType?: boolean
  ref?: string
  node?: number
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

export interface VersionEntry {
  id: string
  label: string
  title: string
  at: string
  current: boolean
  notes: string[]
  files: CorpusVersionFile[]
  author?: CorpusVersionActor | null
  approved_by?: CorpusVersionActor | null
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
  /** Rendered in the CardFrameHeader beside the title. */
  actions?: ReactNode
}

export interface EditPanelProps {
  document: CorpusDocument
  onClose: () => void
}

import type { BookType, CategoryType, LanguageType, ProjectStatus } from "@/lib/projects/vocabulary"

export interface ProjectSummary {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  type: BookType | null
  createdAt: string
  updatedAt: string
}

export interface CorpusLink {
  corpusId: string
  linkedAt: string
  corpus: {
    uid: string
    name: string
    language: string | null
    type: string | null
    category: string | null
    version: string
    available: boolean
  } | null
}

export type CorpusSource = "upload" | "huggingface"

/** The corpus document imported from the Corpus library (lib/corpus). */
export interface ProjectCorpus {
  id: string
  name: string
  source: CorpusSource
  /** Storage path for uploads, the full URL for Hugging Face. */
  path: string
  filename: string | null
  uploadedAt: string | null
}

/** One commit from the corpus' nested .git, newest first. */
export interface CorpusCommit {
  id: string
  sha: string
  message: string
  authorName: string | null
  authorEmail: string | null
  branch: string | null
  committedAt: string | null
}

export interface ProjectCreator {
  id: string
  name: string | null
  username: string
}

export interface ProjectOrganization {
  id: string
  name: string
  website: string | null
}

export interface AttachedLicense {
  id: string
  title: string
  url: string | null
  domains: { content: boolean; data: boolean; software: boolean }
  status: LicenseStatus
  family: string | null
  maintainer: string | null
  /**
   * null until the licence is agreed. The DB pairs agreed_at with
   * agreed_by_user_id under a check constraint, so these two are null together
   * and an attachment is pending exactly when `agreedAt === null`.
   */
  agreedAt: string | null
  agreedBy: ProjectCreator | null
}

export type LicenseStatus = "active" | "retired" | "superseded"

export interface ProjectDetail extends ProjectSummary {
  /** Source languages for scriptural types; empty when not applicable. */
  languages: LanguageType[]
  category: CategoryType | null
  /** Never null — every project records its creator (FR-015). */
  creator: ProjectCreator
  organization: ProjectOrganization | null
  licenses: AttachedLicense[]
  /** Corpus references: library corpora loaded alongside this dataset. */
  corpora: CorpusLink[]
  corpus: ProjectCorpus | null
  commits: CorpusCommit[]
}

export interface CorpusOption {
  id: string
  name: string
  language: string | null
  type: string | null
  available: boolean
  alreadyLinked: boolean
}

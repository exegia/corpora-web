import type {
  BOOK_TYPES,
  CATEGORIZED_TYPES,
  CATEGORY_TYPES,
  LANGUAGE_TYPES,
  PROJECT_STATUSES,
  SCRIPTURAL_TYPES,
} from "./constants"

// ---- Vocabularies (002; mirrors the shared domain enums + DB CHECKs) ------
// Derived from the constants rather than re-listed, so the two can never drift.
// The import above is type-only in both directions — constants.ts annotates
// against these names — so the cycle is erased and never exists at runtime.

export type ProjectStatus = (typeof PROJECT_STATUSES)[number]
export type BookType = (typeof BOOK_TYPES)[number]
export type LanguageType = (typeof LANGUAGE_TYPES)[number]
export type CategoryType = (typeof CATEGORY_TYPES)[number]

/** Types that require a source language (FR-006). */
export type ScripturalType = (typeof SCRIPTURAL_TYPES)[number]

/** Types that require a category (FR-007). */
export type CategorizedType = (typeof CATEGORIZED_TYPES)[number]

/** Discriminated classification value — illegal combinations are untypeable. */
export type Classification =
  | { type: ScripturalType; languages: LanguageType[] }
  | { type: CategorizedType; category: CategoryType }
  | { type: "lexicon" | "manuscript" | "regular" }
  | null

// ---- Errors ---------------------------------------------------------------

export type DataErrorCode =
  | "not-found"
  | "already-linked"
  | "already-attached"
  | "validation"
  | "unavailable"
  | "unknown"

// ---- Domain ---------------------------------------------------------------

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

// ---- Rows (the Supabase select shapes) ------------------------------------
// Internal to this module: the barrel exports the domain types above, and
// callers never see a snake_case row.

export interface ProjectRow {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  type: BookType | null
  created_at: string
  updated_at: string
}

export interface CommitRow {
  id: string
  sha: string
  message: string
  author_name: string | null
  author_email: string | null
  branch: string | null
  committed_at: string | null
}

export interface LicenseRow {
  id: string
  title: string
  url: string | null
  domain_content: boolean
  domain_data: boolean
  domain_software: boolean
  family: string | null
  maintainer: string | null
  status: LicenseStatus
}

export interface CreatorRow {
  id: string
  name: string | null
  username: string
}

export interface DocumentRow {
  id: string
  name: string
  source: CorpusSource
  path: string
  filename: string | null
  uploaded_at: string
  corpus_commits: CommitRow[]
}

export interface ProjectDetailRow extends ProjectRow {
  language: LanguageType[] | null
  category: CategoryType | null
  corpus_documents: DocumentRow | null
  user_directory: CreatorRow | null
  organizations: { id: string; name: string; website: string | null } | null
  project_licences: {
    agreed_at: string | null
    licences: LicenseRow | null
    user_directory: CreatorRow | null
  }[]
  project_corpora: {
    corpus_id: string
    linked_at: string
    corpora: {
      uid: string
      name: string
      language: string | null
      type: string | null
      category: string | null
      version: string
      available: boolean
    } | null
  }[]
}

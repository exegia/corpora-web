import { DataError } from "@/lib/projects/errors"
import type { CorpusCommit, CorpusSource, LicenseStatus, ProjectCreator, ProjectSummary } from "@/lib/projects/types"
import type { BookType, CategoryType, LanguageType, ProjectStatus } from "@/lib/projects/vocabulary"

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

export const PROJECT_COLUMNS = "id, name, description, status, type, created_at, updated_at"

export const PROJECT_DETAIL_COLUMNS = `${PROJECT_COLUMNS}, language, category,
  corpus_documents ( id, name, source, path, filename, uploaded_at,
    corpus_commits ( id, sha, message, author_name, author_email, branch, committed_at ) ),
  user_directory ( id, name, username ),
  organizations ( id, name, website ),
  project_licences ( agreed_at,
    licences ( id, title, url, domain_content, domain_data, domain_software, family, maintainer, status ),
    user_directory ( id, name, username ) ),
  project_corpora ( corpus_id, linked_at,
    corpora ( uid, name, language, type, category, version, available ) )`

export const UNKNOWN_CREATOR: ProjectCreator = { id: "", name: null, username: "unknown" }

export function fail(context: string, error: { code?: string; message?: string }): never {
  if (error.code === "23505") {
    throw new DataError("already-linked", "This corpus is already linked to the project.")
  }
  throw new DataError("unknown", `${context}: ${error.message ?? "unexpected error"}`)
}

export function toSummary(row: ProjectRow): ProjectSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    type: row.type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toCommit(row: CommitRow): CorpusCommit {
  return {
    id: row.id,
    sha: row.sha,
    message: row.message,
    authorName: row.author_name,
    authorEmail: row.author_email,
    branch: row.branch,
    committedAt: row.committed_at,
  }
}

export function requireNonEmpty(value: string, field: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    throw new DataError("validation", `A ${field} is required.`)
  }
  return trimmed
}

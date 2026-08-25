import { LANGUAGE_TYPES, LANGUAGES_BY_TYPE } from "./constants"
import { DataError } from "./errors"
import type {
  CommitRow,
  CorpusCommit,
  LanguageType,
  ProjectRow,
  ProjectSummary,
  ScripturalType,
} from "./types"

export function languageOptionsFor(type: string): readonly LanguageType[] {
  return LANGUAGES_BY_TYPE[type as ScripturalType] ?? LANGUAGE_TYPES
}

/** Turn a PostgREST error into the DataError the routes know how to render. */
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

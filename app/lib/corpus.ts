import type { LucideIcon } from "lucide-react"
import type { BookType } from "@/lib/projects"
import {
    Book,
    BookA,
    BookOpenText,
    Feather,
    MessageSquareText,
    MoonStar,
    NotebookPen,
    Scroll,
    ScrollText,
    UserRound,
} from "lucide-react"

// Data-access layer for corpus documents (003): the Corpus route owns the
// uploaded .corpus files / Hugging Face URLs and their version history;
// projects import a document from this library. Route modules import ONLY
// from this module — never supabase-js directly.

import {
  type CorpusCommit,
  type CorpusSource,
  DataError,
  touchProject,
} from "@/lib/projects"
import { getSupabase } from "@/lib/supabase"
import type { Json } from "@/types/database"

export const CORPUS_BUCKET = "project-corpora"

/** Commit shape produced by extractCorpusHistory, before it has a row id. */
export interface CorpusCommitInput {
  sha: string
  message: string
  authorName: string | null
  authorEmail: string | null
  branch: string | null
  committedAt: string | null
}

/** Manifest "type" in the corpora-py contract (ICorpusManifest.type). */
export type CorpusType = "text" | "web" | "parallel" | "speech" | "docs"

export interface CorpusDocument {
  id: string
  name: string
  source: CorpusSource
  /** Storage path for uploads, the full URL for Hugging Face. */
  path: string
  filename: string | null
  /** Conversion job id for GET /convert/{job_id}/… explore. Null on uploads. */
  jobId: string | null
  uploadedAt: string
  commits: CorpusCommit[]
  /** Conversion metadata (corpora-py contract) — null on legacy rows. */
  corpusType: CorpusType | null
  /** `source_format` as sent to POST /convert ("text-fabric", "tei", …). */
  sourceFormat: string | null
  licence: string | null
  language: string | null
  sizeBytes: number | null
  docsCount: number | null
  nodes: number | null
  words: number | null
  status: "converted" | "uploaded" | null
  convertedAt: string | null
  /** Manifest description, captured from the archive at conversion time. */
  description: string | null
  /** toc.yml section rows captured at conversion time (see corpus-archive). */
  toc: CorpusSection[] | null
}

/** One toc.yml section row (mirrors corpus-archive's CorpusSection). */
export interface CorpusSection {
  title: string
  nodes: number | null
  words: number | null
}

interface CommitRow {
  id: string
  sha: string
  message: string
  author_name: string | null
  author_email: string | null
  branch: string | null
  committed_at: string | null
}

interface DocumentRow {
  id: string
  name: string
  source: CorpusSource
  path: string
  filename: string | null
  job_id: string | null
  uploaded_at: string
  corpus_type: CorpusType | null
  source_format: string | null
  licence: string | null
  language: string | null
  size_bytes: number | null
  docs_count: number | null
  nodes: number | null
  words: number | null
  status: "converted" | "uploaded" | null
  converted_at: string | null
  description: string | null
  toc: CorpusSection[] | null
  corpus_commits: CommitRow[]
}

const DOCUMENT_COLUMNS = `id, name, source, path, filename, job_id, uploaded_at,
  corpus_type, source_format, licence, language, size_bytes, docs_count,
  nodes, words, status, converted_at, description, toc,
  corpus_commits ( id, sha, message, author_name, author_email, branch, committed_at )`

function toCommit(row: CommitRow): CorpusCommit {
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

function toDocument(row: DocumentRow): CorpusDocument {
  return {
    id: row.id,
    name: row.name,
    source: row.source,
    path: row.path,
    filename: row.filename,
    jobId: row.job_id ?? null,
    uploadedAt: row.uploaded_at,
    corpusType: row.corpus_type ?? null,
    sourceFormat: row.source_format ?? null,
    licence: row.licence ?? null,
    language: row.language ?? null,
    sizeBytes: row.size_bytes ?? null,
    docsCount: row.docs_count ?? null,
    nodes: row.nodes ?? null,
    words: row.words ?? null,
    status: row.status ?? null,
    convertedAt: row.converted_at ?? null,
    description: row.description ?? null,
    toc: row.toc ?? null,
    commits: (row.corpus_commits ?? [])
      .map(toCommit)
      .sort((a, b) => (b.committedAt ?? "").localeCompare(a.committedAt ?? "")),
  }
}

export function isHuggingFaceUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      (url.hostname === "huggingface.co" || url.hostname === "www.huggingface.co")
    )
  } catch {
    return false
  }
}

/** Every corpus document, newest first. */
export async function listCorpusDocuments(): Promise<CorpusDocument[]> {
  const { data, error } = await getSupabase()
    .from("corpus_documents")
    .select(DOCUMENT_COLUMNS)
    .order("uploaded_at", { ascending: false })
  if (error) {
    throw new DataError(
      "unknown",
      `Could not load the corpus library: ${error.message ?? "unexpected error"}`,
    )
  }
  return ((data ?? []) as unknown as DocumentRow[]).map(toDocument)
}

/** One corpus document with its history, or null when it no longer exists. */
export async function getCorpusDocument(
  id: string,
): Promise<CorpusDocument | null> {
  if (!id.trim()) return null
  const { data, error } = await getSupabase()
    .from("corpus_documents")
    .select(DOCUMENT_COLUMNS)
    .eq("id", id)
    .maybeSingle()
  if (error) {
    throw new DataError(
      "unknown",
      `Could not load the corpus: ${error.message ?? "unexpected error"}`,
    )
  }
  if (!data) return null
  return toDocument(data as unknown as DocumentRow)
}

/** Upload the .corpus file to the private bucket; returns its storage path. */
export async function uploadCorpusFile(file: File): Promise<string> {
  if (!file.name.endsWith(".corpus")) {
    throw new DataError("validation", "Pick a .corpus file.")
  }
  const path = `${crypto.randomUUID()}/${file.name}`
  const { error } = await getSupabase()
    .storage.from(CORPUS_BUCKET)
    .upload(path, file, { upsert: true })
  if (error) {
    throw new DataError(
      "unavailable",
      `Could not upload the corpus: ${error.message ?? "unexpected error"}`,
    )
  }
  return path
}

/** Metadata a conversion attaches to its document (corpora-py contract). */
export interface CorpusMetadataInput {
  corpusType?: CorpusType | null
  sourceFormat?: string | null
  licence?: string | null
  language?: string | null
  sizeBytes?: number | null
  docsCount?: number | null
  nodes?: number | null
  words?: number | null
  status?: "converted" | "uploaded" | null
  convertedAt?: string | null
  description?: string | null
  toc?: CorpusSection[] | null
  jobId?: string | null
}

/** Record a corpus document with the history extracted from its archive. */
export async function createCorpusDocument(input: {
  name: string
  source: CorpusSource
  path: string
  filename: string | null
  commits: CorpusCommitInput[]
} & CorpusMetadataInput): Promise<CorpusDocument> {
  const name = input.name.trim()
  if (!name) {
    throw new DataError("validation", "A corpus name is required.")
  }
  if (input.source === "huggingface" && !isHuggingFaceUrl(input.path)) {
    throw new DataError("validation", "Enter a valid Hugging Face URL.")
  }
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("corpus_documents")
    .insert({
      name,
      source: input.source,
      path: input.path,
      filename: input.filename,
      job_id: input.jobId ?? null,
      corpus_type: input.corpusType ?? null,
      source_format: input.sourceFormat ?? null,
      licence: input.licence ?? null,
      language: input.language ?? null,
      size_bytes: input.sizeBytes ?? null,
      docs_count: input.docsCount ?? null,
      nodes: input.nodes ?? null,
      words: input.words ?? null,
      status: input.status ?? null,
      converted_at: input.convertedAt ?? null,
      description: input.description ?? null,
      // Structurally Json (plain title/nodes/words objects); the generated
      // Json type just can't see through the interface.
      toc: (input.toc ?? null) as unknown as Json,
    })
    .select(`id, name, source, path, filename, job_id, uploaded_at,
      corpus_type, source_format, licence, language, size_bytes, docs_count,
      nodes, words, status, converted_at, description, toc`)
    .single()
  if (error || !data) {
    throw new DataError(
      "unknown",
      `Could not add the corpus: ${error?.message ?? "unexpected error"}`,
    )
  }
  const row = data as Omit<DocumentRow, "corpus_commits">

  if (input.commits.length > 0) {
    const inserted = await supabase.from("corpus_commits").insert(
      input.commits.map((commit) => ({
        document_id: row.id,
        sha: commit.sha,
        message: commit.message,
        author_name: commit.authorName,
        author_email: commit.authorEmail,
        branch: commit.branch,
        committed_at: commit.committedAt,
      })),
    )
    if (inserted.error) {
      throw new DataError(
        "unknown",
        `Could not save the version history: ${inserted.error.message ?? "unexpected error"}`,
      )
    }
  }
  return toDocument({ ...row, corpus_commits: [] })
}

/**
 * Delete a document, its stored file, and (via cascade) its history.
 * Projects referencing it fall back to "no corpus" (FK on delete set null).
 */
export async function deleteCorpusDocument(id: string): Promise<void> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("corpus_documents")
    .select("source, path")
    .eq("id", id)
    .maybeSingle()
  if (error) {
    throw new DataError(
      "unknown",
      `Could not load the corpus: ${error.message ?? "unexpected error"}`,
    )
  }
  if (!data) {
    throw new DataError("not-found", "This corpus no longer exists.")
  }
  const row = data as { source: CorpusSource; path: string }
  if (row.source === "upload") {
    // Best effort — a stale storage object must not block the delete.
    await supabase.storage.from(CORPUS_BUCKET).remove([row.path])
  }
  const deleted = await supabase.from("corpus_documents").delete().eq("id", id)
  if (deleted.error) {
    throw new DataError(
      "unknown",
      `Could not delete the corpus: ${deleted.error.message ?? "unexpected error"}`,
    )
  }
}

/** Import a library document as the project's corpus (FK enforces existence). */
export async function attachCorpusToProject(
  projectId: string,
  documentId: string,
): Promise<void> {
  if (!documentId.trim()) {
    throw new DataError("validation", "Pick a corpus to import.")
  }
  const { data, error } = await getSupabase()
    .from("projects")
    .update({
      corpus_document_id: documentId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .select("id")
    .maybeSingle()
  if (error) {
    throw new DataError(
      "unknown",
      `Could not import the corpus: ${error.message ?? "unexpected error"}`,
    )
  }
  if (!data) {
    throw new DataError("not-found", "This project no longer exists.")
  }
}

/** Detach the project's corpus; the document stays in the library. */
export async function detachCorpusFromProject(projectId: string): Promise<void> {
  const { data, error } = await getSupabase()
    .from("projects")
    .update({ corpus_document_id: null })
    .eq("id", projectId)
    .select("id")
    .maybeSingle()
  if (error) {
    throw new DataError(
      "unknown",
      `Could not detach the corpus: ${error.message ?? "unexpected error"}`,
    )
  }
  if (!data) {
    throw new DataError("not-found", "This project no longer exists.")
  }
  await touchProject(projectId)
}

export const TYPE_ICONS: Record<BookType, LucideIcon> = {
    bible: BookOpenText,
    tanakh: ScrollText,
    quran: MoonStar,
    apocrypha: Scroll,
    commentary: MessageSquareText,
    lexicon: BookA,
    biography: UserRound,
    review: NotebookPen,
    manuscript: Feather,
    regular: Book,
}
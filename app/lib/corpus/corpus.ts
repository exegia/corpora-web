
/** Commit shape produced by extractCorpusHistory, before it has a row id. */

import type { Json } from "@/types/database";
import { type CorpusSource, DataError, touchProject } from "../projects";
import { getSupabase } from "../supabase";
import { CORPUS_BUCKET, DOCUMENT_COLUMNS } from "./constants";
import type { CorpusCommitInput, CorpusDocument, CorpusMetadataInput, DocumentRow } from "./types";
import { isHuggingFaceUrl, toDocument } from "./utils";


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

/** Persist name / description / language (and licence) on the library row. */
export async function updateCorpusDocument(
  id: string,
  patch: {
    name?: string
    description?: string | null
    language?: string | null
    licence?: string | null
  },
): Promise<CorpusDocument> {
  const row: {
    name?: string
    description?: string | null
    language?: string | null
    licence?: string | null
  } = {}
  if (patch.name !== undefined) {
    const name = patch.name.trim()
    if (!name) {
      throw new DataError("validation", "A corpus name is required.")
    }
    row.name = name
  }
  if (patch.description !== undefined) {
    row.description = patch.description?.trim() || null
  }
  if (patch.language !== undefined) {
    row.language = patch.language?.trim() || null
  }
  if (patch.licence !== undefined) {
    row.licence = patch.licence?.trim() || null
  }
  if (Object.keys(row).length === 0) {
    throw new DataError("validation", "Provide at least one field to update.")
  }
  const { data, error } = await getSupabase()
    .from("corpus_documents")
    .update(row)
    .eq("id", id)
    .select(DOCUMENT_COLUMNS)
    .maybeSingle()
  if (error) {
    throw new DataError(
      "unknown",
      `Could not save the corpus: ${error.message ?? "unexpected error"}`,
    )
  }
  if (!data) {
    throw new DataError("not-found", "This corpus no longer exists.")
  }
  return toDocument(data as unknown as DocumentRow)
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


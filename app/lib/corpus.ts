// Data-access layer for the project's own corpus (003): the uploaded .corpus
// file (private storage bucket) or a Hugging Face URL, plus the version
// history extracted from the archive's nested .git. Route modules import ONLY
// from this module — never supabase-js directly.

import {
  type CorpusSource,
  DataError,
  touchProject,
} from "@/lib/projects"
import { getSupabase } from "@/lib/supabase"

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

/** Upload the .corpus file to the private bucket; returns its storage path. */
export async function uploadCorpusFile(
  projectId: string,
  file: File,
): Promise<string> {
  if (!file.name.endsWith(".corpus")) {
    throw new DataError("validation", "Pick a .corpus file.")
  }
  const path = `${projectId}/${file.name}`
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

/**
 * Record the project's corpus and replace its version history in one go.
 * The history is wholesale-replaced because it belongs to the uploaded
 * archive, not to individual edits.
 */
export async function setProjectCorpus(
  projectId: string,
  input: {
    source: CorpusSource
    path: string
    filename: string | null
    commits: CorpusCommitInput[]
  },
): Promise<void> {
  if (input.source === "huggingface" && !isHuggingFaceUrl(input.path)) {
    throw new DataError("validation", "Enter a valid Hugging Face URL.")
  }
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("projects")
    .update({
      corpus_source: input.source,
      corpus_path: input.path,
      corpus_filename: input.filename,
      corpus_uploaded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .select("id")
    .maybeSingle()
  if (error) {
    throw new DataError(
      "unknown",
      `Could not attach the corpus: ${error.message ?? "unexpected error"}`,
    )
  }
  if (!data) {
    throw new DataError("not-found", "This project no longer exists.")
  }

  const cleared = await supabase
    .from("corpus_commits")
    .delete()
    .eq("project_id", projectId)
  if (cleared.error) {
    throw new DataError(
      "unknown",
      `Could not reset the version history: ${cleared.error.message ?? "unexpected error"}`,
    )
  }
  if (input.commits.length > 0) {
    const inserted = await supabase.from("corpus_commits").insert(
      input.commits.map((commit) => ({
        project_id: projectId,
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
}

/** Detach the corpus: clear the project fields, history, and stored file. */
export async function detachProjectCorpus(projectId: string): Promise<void> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("projects")
    .select("corpus_source, corpus_path")
    .eq("id", projectId)
    .maybeSingle()
  if (error) {
    throw new DataError(
      "unknown",
      `Could not load the project: ${error.message ?? "unexpected error"}`,
    )
  }
  if (!data) {
    throw new DataError("not-found", "This project no longer exists.")
  }

  const row = data as { corpus_source: CorpusSource | null; corpus_path: string | null }
  if (row.corpus_source === "upload" && row.corpus_path) {
    // Best effort — a stale storage object must not block the detach.
    await supabase.storage.from(CORPUS_BUCKET).remove([row.corpus_path])
  }

  const updated = await supabase
    .from("projects")
    .update({
      corpus_source: null,
      corpus_path: null,
      corpus_filename: null,
      corpus_uploaded_at: null,
    })
    .eq("id", projectId)
  if (updated.error) {
    throw new DataError(
      "unknown",
      `Could not detach the corpus: ${updated.error.message ?? "unexpected error"}`,
    )
  }
  const cleared = await supabase
    .from("corpus_commits")
    .delete()
    .eq("project_id", projectId)
  if (cleared.error) {
    throw new DataError(
      "unknown",
      `Could not clear the version history: ${cleared.error.message ?? "unexpected error"}`,
    )
  }
  await touchProject(projectId)
}

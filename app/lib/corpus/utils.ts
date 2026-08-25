import type { CorpusCommit } from "../projects";
import type { CorpusDocument, CommitRow, DocumentRow } from "./types";


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

export function toDocument(row: DocumentRow): CorpusDocument {
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


export function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

export function asCount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.round(value)
    : null
}

/** Shallowest match wins — archives may nest everything under one folder. */
export function findEntry(
  entries: Record<string, Uint8Array>,
  basename: string,
): Uint8Array | null {
  const matches = Object.keys(entries)
    .filter((name) => name === basename || name.endsWith(`/${basename}`))
    .sort((a, b) => a.length - b.length)
  return matches.length > 0 ? entries[matches[0]] : null
}

export function parseYamlEntry(data: Uint8Array | null): unknown {
  if (!data) return null
  try {
    return parse(new TextDecoder().decode(data))
  } catch {
    return null
  }
}

/**
 * The toc.yml shape is owned by the converter and open-ended; accept the
 * plausible containers (a bare array, or an object's first array value under
 * sections/toc/items/children) and read title/nodes/words per entry.
 */
export function extractSections(toc: unknown): CorpusSection[] {
  let list: unknown[] | null = null
  if (Array.isArray(toc)) {
    list = toc
  } else if (toc && typeof toc === "object") {
    const record = toc as Record<string, unknown>
    for (const key of ["sections", "toc", "items", "children"]) {
      if (Array.isArray(record[key])) {
        list = record[key] as unknown[]
        break
      }
    }
  }
  if (!list) return []

  const sections: CorpusSection[] = []
  for (const item of list) {
    if (!item || typeof item !== "object") continue
    const record = item as Record<string, unknown>
    const title =
      asString(record.title) ?? asString(record.name) ?? asString(record.label)
    if (!title) continue
    sections.push({
      title,
      nodes: asCount(record.nodes) ?? asCount(record.node_count),
      words: asCount(record.words) ?? asCount(record.word_count),
    })
  }
  return sections
}


export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}

export const defaultDelay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))


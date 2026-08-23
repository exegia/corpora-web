// Authentic corpus metadata (004): a .corpus archive carries manifest.yml
// (ICorpusManifest) and toc.yml alongside the dataset. The backend can only
// serve these for Hub-published archives (research.md R2, corpora-py#103),
// so we read them in the browser at conversion time. Parsing degrades
// field-by-field — only an unreadable zip throws.

import { unzipSync } from "fflate"
import { parse } from "yaml"
import type { CorpusSection, CorpusType } from "@/lib/corpus"
import { DataError } from "@/lib/projects"

export type { CorpusSection }

/**
 * Unzip a .corpus archive into its entries. Shared with corpus-history's
 * .git reader so both features agree on what "not a corpus archive" means.
 */
export async function unzipCorpusArchive(
  file: Blob,
): Promise<Record<string, Uint8Array>> {
  try {
    return unzipSync(new Uint8Array(await file.arrayBuffer()))
  } catch {
    throw new DataError(
      "validation",
      "This does not look like a valid .corpus archive.",
    )
  }
}

export interface CorpusArchiveInfo {
  name: string | null
  description: string | null
  language: string | null
  corpusType: CorpusType | null
  version: string | null
  sections: CorpusSection[]
}

/** Manifest "type" values mapped onto the app's corpus types. */
const MANIFEST_TYPE_MAP: Record<string, CorpusType> = {
  text: "text",
  book: "text",
  bible: "text",
  web: "web",
  parallel: "parallel",
  speech: "speech",
  docs: "docs",
  document: "docs",
}

/** Shallowest match wins — archives may nest everything under one folder. */
function findEntry(
  entries: Record<string, Uint8Array>,
  basename: string,
): Uint8Array | null {
  const matches = Object.keys(entries)
    .filter((name) => name === basename || name.endsWith(`/${basename}`))
    .sort((a, b) => a.length - b.length)
  return matches.length > 0 ? entries[matches[0]] : null
}

function parseYamlEntry(data: Uint8Array | null): unknown {
  if (!data) return null
  try {
    return parse(new TextDecoder().decode(data))
  } catch {
    return null
  }
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function asCount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.round(value)
    : null
}

/**
 * The toc.yml shape is owned by the converter and open-ended; accept the
 * plausible containers (a bare array, or an object's first array value under
 * sections/toc/items/children) and read title/nodes/words per entry.
 */
function extractSections(toc: unknown): CorpusSection[] {
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

/**
 * Read manifest.yml + toc.yml out of a downloaded .corpus archive. Missing
 * or malformed metadata degrades to nulls/[] — never blocks persisting the
 * conversion. Throws DataError("validation") only for an unreadable zip.
 */
export async function readCorpusArchive(file: Blob): Promise<CorpusArchiveInfo> {
  const entries = await unzipCorpusArchive(file)

  const manifest = parseYamlEntry(findEntry(entries, "manifest.yml")) as
    | Record<string, unknown>
    | null
  const toc = parseYamlEntry(findEntry(entries, "toc.yml"))

  const manifestType = asString(manifest?.type)?.toLowerCase() ?? null
  return {
    name: asString(manifest?.name),
    description: asString(manifest?.description),
    language: asString(manifest?.language),
    corpusType: manifestType
      ? (MANIFEST_TYPE_MAP[manifestType] ?? "text")
      : null,
    version: asString(manifest?.version),
    sections: extractSections(toc),
  }
}

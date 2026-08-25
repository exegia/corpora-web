import { type FileIconProps, FileWordmarkCorpus } from "@exegia/corpora-ui"
import type { ComponentType } from "react"
import type { BadgeProps } from "@/components/ui/badge"
import type { CorpusDocument, CorpusType } from "@/lib/corpus"
import type { CorpusFilters, DateFilter } from "./types"

export const PAGE_SIZE = 6

export const DEFAULT_FILTERS: CorpusFilters = {
  query: "",
  type: "all",
  date: "any",
  language: "all",
}

/** Status-badge convention from docs/ui-patterns.md, mapped onto types. */
export const TYPE_BADGE_VARIANTS: Record<CorpusType, BadgeProps["variant"]> = {
  text: "secondary",
  web: "info",
  parallel: "warning",
  speech: "success",
  docs: "secondary",
}

export const TYPE_LABELS: Record<CorpusType, string> = {
  text: "Text",
  web: "Web",
  parallel: "Parallel",
  speech: "Speech",
  docs: "Docs",
}

export function formatSize(bytes: number | null): string {
  if (bytes === null) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}

function isCorpusObject(document: CorpusDocument): boolean {
  return (
    document.source !== "huggingface" ||
    Boolean(document.filename && /\.corpus$/i.test(document.filename))
  )
}

/** The file type shown on the library row and detail header. */
export function formatOf(document: CorpusDocument): string {
  return isCorpusObject(document) ? ".corpus" : "Hugging Face"
}

/**
 * The corpora-ui wordmark for the library object. Converted and uploaded
 * rows are always `.corpus` (source format lives on the details card).
 */
export function fileIconFor(
  document: CorpusDocument,
): ComponentType<FileIconProps> | null {
  return isCorpusObject(document) ? FileWordmarkCorpus : null
}

export function subtitleOf(document: CorpusDocument): string {
  return `${formatOf(document)} · ${document.licence ?? "No licence"}`
}

const DATE_WINDOWS: Record<Exclude<DateFilter, "any">, number> = {
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
}

function updatedAt(document: CorpusDocument): string {
  return document.convertedAt ?? document.uploadedAt
}

export function filterDocuments(
  documents: CorpusDocument[],
  filters: CorpusFilters,
  now: Date = new Date(),
): CorpusDocument[] {
  const query = filters.query.trim().toLowerCase()
  return documents.filter((document) => {
    if (query && !document.name.toLowerCase().includes(query)) return false
    if (filters.type !== "all" && document.corpusType !== filters.type) {
      return false
    }
    if (
      filters.language !== "all" &&
      document.language !== filters.language
    ) {
      return false
    }
    if (filters.date !== "any") {
      const cutoff = now.getTime() - DATE_WINDOWS[filters.date]
      if (new Date(updatedAt(document)).getTime() < cutoff) return false
    }
    return true
  })
}

export function paginate<T>(items: T[], page: number, size = PAGE_SIZE): T[] {
  return items.slice((page - 1) * size, page * size)
}

/** Distinct languages present in the library, for the Language filter. */
export function collectLanguages(documents: CorpusDocument[]): string[] {
  return [
    ...new Set(
      documents
        .map((document) => document.language)
        .filter((language): language is string => language !== null),
    ),
  ].sort()
}

import type { CorpusSection } from "@/lib/corpus"
import type { ExploreTab } from "./types"

export const EXPLORE_TABS = [
  "overview",
  "documents",
  "structure",
  "analytics",
  "activity",
] as const

/** Guard a `?tab=` search value against the explorer's known tabs. */
export function parseExploreTab(value: string | null): ExploreTab {
  if (value && (EXPLORE_TABS as readonly string[]).includes(value)) {
    return value as ExploreTab
  }
  return "overview"
}
/**
 * Short roman-style labels for the "words per document" chart. Known Summa
 * parts get the conventional sigla; anything else keeps a truncated title.
 */
export function abbreviateSection(title: string): string {
  const key = title.trim().toLowerCase()
  if (key === "prima pars") return "I"
  if (key === "prima secundae") return "I-II"
  if (key === "secunda secundae") return "II-II"
  if (key === "tertia pars") return "III"
  if (key.startsWith("supplement")) return "Suppl."
  return title.length > 8 ? `${title.slice(0, 7)}…` : title
}

export function sectionByTitle(
  sections: CorpusSection[] | null | undefined,
  title: string | null,
): CorpusSection | null {
  if (!sections || sections.length === 0) return null
  if (!title) return sections[0] ?? null
  return (
    sections.find((section) => section.title === title) ?? sections[0] ?? null
  )
}

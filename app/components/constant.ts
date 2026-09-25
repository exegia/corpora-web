import type { CorpusType } from "@/lib/corpus"
import type { CorpusFilters } from "./corpus/types"
import type { BadgeProps } from "./ui/badge"

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

export const EXPLORE_TABS = [
  "overview",
  "documents",
  "structure",
  "analytics",
  "activity",
] as const
// ---- Vocabularies (002; mirrors the shared domain enums + DB CHECKs) ------

export const PROJECT_STATUSES = [
  "draft",
  "started",
  "ready-for-review",
  "published",
  "failed",
] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

/**
 * Pre-auth superadmin: publishing decisions belong to this directory user
 * until corpora-auth lands. The session is treated as the superadmin when a
 * directory row with this email exists (see users.getSuperadmin).
 */
export const SUPERADMIN_EMAIL =
  import.meta.env?.VITE_SUPERADMIN_EMAIL ?? "manny.defreitas7@gmail.com"

export const BOOK_TYPES = [
  "bible",
  "commentary",
  "lexicon",
  "biography",
  "review",
  "manuscript",
  "tanakh",
  "quran",
  "apocrypha",
  "regular",
] as const
export type BookType = (typeof BOOK_TYPES)[number]

export const LANGUAGE_TYPES = [
  "hebrew",
  "greek",
  "syriac",
  "arabic",
  "aramaic",
  "protoCuneiform",
  "akkadian",
  "ugaritic",
  "pali",
  "latin",
  "dutch",
  "french",
  "italian",
  "english",
] as const
export type LanguageType = (typeof LANGUAGE_TYPES)[number]

export const CATEGORY_TYPES = [
  "biblical",
  "religious",
  "literary",
  "historical",
  "paratext",
] as const
export type CategoryType = (typeof CATEGORY_TYPES)[number]

/** Types that require a source language (FR-006). */
export const SCRIPTURAL_TYPES = ["bible", "tanakh", "quran", "apocrypha"] as const
export type ScripturalType = (typeof SCRIPTURAL_TYPES)[number]

/**
 * Scriptural types with a constrained source-language vocabulary. Types not
 * listed here offer the full LANGUAGE_TYPES list.
 */
export const LANGUAGES_BY_TYPE: Partial<Record<ScripturalType, readonly LanguageType[]>> = {
  quran: ["arabic", "english"],
  bible: ["greek", "aramaic", "hebrew", "latin", "french", "english", "syriac"],
}

export function languageOptionsFor(type: string): readonly LanguageType[] {
  return LANGUAGES_BY_TYPE[type as ScripturalType] ?? LANGUAGE_TYPES
}

/** Types that require a category (FR-007). */
export const CATEGORIZED_TYPES = ["biography", "commentary", "review"] as const
export type CategorizedType = (typeof CATEGORIZED_TYPES)[number]

/** Discriminated classification value — illegal combinations are untypeable. */
export type Classification =
  | { type: ScripturalType; languages: LanguageType[] }
  | { type: CategorizedType; category: CategoryType }
  | { type: "lexicon" | "manuscript" | "regular" }
  | null

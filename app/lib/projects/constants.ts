import type { LanguageType, ProjectCreator, ScripturalType } from "./types"

// ---- Vocabularies (002; mirrors the shared domain enums + DB CHECKs) ------
// The matching type aliases are derived from these lists in types.ts.

export const PROJECT_STATUSES = [
  "draft",
  "started",
  "ready-for-review",
  "published",
  "failed",
] as const

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

export const CATEGORY_TYPES = [
  "biblical",
  "religious",
  "literary",
  "historical",
  "paratext",
] as const

/** Types that require a source language (FR-006). */
export const SCRIPTURAL_TYPES = ["bible", "tanakh", "quran", "apocrypha"] as const

/** Types that require a category (FR-007). */
export const CATEGORIZED_TYPES = ["biography", "commentary", "review"] as const

/**
 * Scriptural types with a constrained source-language vocabulary. Types not
 * listed here offer the full LANGUAGE_TYPES list.
 */
export const LANGUAGES_BY_TYPE: Partial<Record<ScripturalType, readonly LanguageType[]>> = {
  quran: ["arabic", "english"],
  bible: ["greek", "aramaic", "hebrew", "latin", "french", "english", "syriac"],
}

// ---- Select column lists --------------------------------------------------

export const PROJECT_COLUMNS = "id, name, description, status, type, created_at, updated_at"

export const PROJECT_DETAIL_COLUMNS = `${PROJECT_COLUMNS}, language, category,
  corpus_documents ( id, name, source, path, filename, uploaded_at,
    corpus_commits ( id, sha, message, author_name, author_email, branch, committed_at ) ),
  user_directory ( id, name, username ),
  organizations ( id, name, website ),
  project_licences ( agreed_at,
    licences ( id, title, url, domain_content, domain_data, domain_software, family, maintainer, status ),
    user_directory ( id, name, username ) ),
  project_corpora ( corpus_id, linked_at,
    corpora ( uid, name, language, type, category, version, available ) )`

export const UNKNOWN_CREATOR: ProjectCreator = { id: "", name: null, username: "unknown" }

// Data-access layer for the Project Workspace feature.
// Contract: specs/001-project-workspace/contracts/data-access.md
// Route modules import ONLY from this module — never supabase-js directly.

import { getSupabase } from "@/lib/supabase"

export type DataErrorCode =
  | "not-found"
  | "already-linked"
  | "already-attached"
  | "validation"
  | "unavailable"
  | "unknown"

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

export class DataError extends Error {
  code: DataErrorCode

  constructor(code: DataErrorCode, message: string) {
    super(message)
    this.name = "DataError"
    this.code = code
  }
}

export interface ProjectSummary {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  type: BookType | null
  createdAt: string
  updatedAt: string
}

export interface CorpusLink {
  corpusId: string
  linkedAt: string
  corpus: {
    uid: string
    name: string
    language: string | null
    type: string | null
    category: string | null
    version: string
    available: boolean
  } | null
}

export type CorpusSource = "upload" | "huggingface"

/** The project's own corpus — an uploaded .corpus file or a Hugging Face URL. */
export interface ProjectCorpus {
  source: CorpusSource
  /** Storage path for uploads, the full URL for Hugging Face. */
  path: string
  filename: string | null
  uploadedAt: string | null
}

/** One commit from the corpus' nested .git, newest first. */
export interface CorpusCommit {
  id: string
  sha: string
  message: string
  authorName: string | null
  authorEmail: string | null
  branch: string | null
  committedAt: string | null
}

export interface ProjectCreator {
  id: string
  name: string | null
  username: string
}

export interface ProjectOrganization {
  id: string
  name: string
  website: string | null
}

export interface AttachedLicense {
  id: string
  title: string
  url: string | null
  domains: { content: boolean; data: boolean; software: boolean }
  status: LicenseStatus
  family: string | null
  maintainer: string | null
  agreedAt: string
  agreedBy: ProjectCreator
}

export type LicenseStatus = "active" | "retired" | "superseded"

export interface ProjectDetail extends ProjectSummary {
  /** Source languages for scriptural types; empty when not applicable. */
  languages: LanguageType[]
  category: CategoryType | null
  /** Never null — every project records its creator (FR-015). */
  creator: ProjectCreator
  organization: ProjectOrganization | null
  licenses: AttachedLicense[]
  /** Corpus references: library corpora loaded alongside this dataset. */
  corpora: CorpusLink[]
  corpus: ProjectCorpus | null
  commits: CorpusCommit[]
}

export interface CorpusOption {
  id: string
  name: string
  language: string | null
  type: string | null
  available: boolean
  alreadyLinked: boolean
}

interface ProjectRow {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  type: BookType | null
  created_at: string
  updated_at: string
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

interface LicenseRow {
  id: string
  title: string
  url: string | null
  domain_content: boolean
  domain_data: boolean
  domain_software: boolean
  family: string | null
  maintainer: string | null
  status: LicenseStatus
}

interface CreatorRow {
  id: string
  name: string | null
  username: string
}

interface ProjectDetailRow extends ProjectRow {
  language: LanguageType[] | null
  category: CategoryType | null
  corpus_source: CorpusSource | null
  corpus_path: string | null
  corpus_filename: string | null
  corpus_uploaded_at: string | null
  user_directory: CreatorRow | null
  organizations: { id: string; name: string; website: string | null } | null
  project_licences: {
    agreed_at: string | null
    licences: LicenseRow | null
    user_directory: CreatorRow | null
  }[]
  project_corpora: {
    corpus_id: string
    linked_at: string
    corpora: {
      uid: string
      name: string
      language: string | null
      type: string | null
      category: string | null
      version: string
      available: boolean
    } | null
  }[]
  corpus_commits: CommitRow[]
}

const PROJECT_COLUMNS = "id, name, description, status, type, created_at, updated_at"

const PROJECT_DETAIL_COLUMNS = `${PROJECT_COLUMNS}, language, category,
  corpus_source, corpus_path, corpus_filename, corpus_uploaded_at,
  user_directory ( id, name, username ),
  organizations ( id, name, website ),
  project_licences ( agreed_at,
    licences ( id, title, url, domain_content, domain_data, domain_software, family, maintainer, status ),
    user_directory ( id, name, username ) ),
  project_corpora ( corpus_id, linked_at,
    corpora ( uid, name, language, type, category, version, available ) ),
  corpus_commits ( id, sha, message, author_name, author_email, branch, committed_at )`

const UNKNOWN_CREATOR: ProjectCreator = { id: "", name: null, username: "unknown" }

function fail(context: string, error: { code?: string; message?: string }): never {
  if (error.code === "23505") {
    throw new DataError("already-linked", "This corpus is already linked to the project.")
  }
  throw new DataError("unknown", `${context}: ${error.message ?? "unexpected error"}`)
}

function toSummary(row: ProjectRow): ProjectSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    type: row.type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

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

function requireNonEmpty(value: string, field: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    throw new DataError("validation", `A ${field} is required.`)
  }
  return trimmed
}

/**
 * Bump projects.updated_at so list ordering reflects child activity (FR-002)
 * and metadata edits refresh the timestamp (002 FR-016). Exported for the
 * sibling data-access modules (licenses).
 */
export async function touchProject(projectId: string): Promise<void> {
  await getSupabase()
    .from("projects")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", projectId)
}

// ---- Projects (US1) -------------------------------------------------------

export async function listProjects(): Promise<ProjectSummary[]> {
  const { data, error } = await getSupabase()
    .from("projects")
    .select(PROJECT_COLUMNS)
    .order("updated_at", { ascending: false })
  if (error) fail("Could not load projects", error)
  return ((data ?? []) as ProjectRow[]).map(toSummary)
}

export async function getProject(id: string): Promise<ProjectDetail | null> {
  const { data, error } = await getSupabase()
    .from("projects")
    .select(PROJECT_DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle()
  if (error) fail("Could not load the project", error)
  if (!data) return null

  const row = data as unknown as ProjectDetailRow
  return {
    ...toSummary(row),
    languages: row.language ?? [],
    category: row.category,
    creator: row.user_directory ?? UNKNOWN_CREATOR,
    organization: row.organizations,
    licenses: row.project_licences
      .filter((attachment) => attachment.licences !== null)
      .map((attachment) => {
        const license = attachment.licences as LicenseRow
        return {
          id: license.id,
          title: license.title,
          url: license.url,
          domains: {
            content: license.domain_content,
            data: license.domain_data,
            software: license.domain_software,
          },
          status: license.status,
          family: license.family,
          maintainer: license.maintainer,
          // agreed_at is nullable in the DB but paired with agreed_by_user_id;
          // the app always attaches with agreement, so "" only appears for
          // rows written by other clients without one.
          agreedAt: attachment.agreed_at ?? "",
          agreedBy: attachment.user_directory ?? UNKNOWN_CREATOR,
        }
      })
      .sort((a, b) => a.agreedAt.localeCompare(b.agreedAt)),
    corpora: row.project_corpora
      .map((link) => ({
        corpusId: link.corpus_id,
        linkedAt: link.linked_at,
        corpus: link.corpora,
      }))
      .sort((a, b) => a.linkedAt.localeCompare(b.linkedAt)),
    corpus: row.corpus_source && row.corpus_path
      ? {
          source: row.corpus_source,
          path: row.corpus_path,
          filename: row.corpus_filename,
          uploadedAt: row.corpus_uploaded_at,
        }
      : null,
    commits: row.corpus_commits
      .map(toCommit)
      .sort((a, b) => (b.committedAt ?? "").localeCompare(a.committedAt ?? "")),
  }
}

export async function createProject(input: {
  name: string
  description?: string
  /** Creating user from the seeded directory — required, never anonymous (FR-015). */
  userId: string
}): Promise<ProjectSummary> {
  const name = requireNonEmpty(input.name, "project name")
  if (!input.userId?.trim()) {
    throw new DataError("validation", "A creator is required — pick your user profile.")
  }
  const { data, error } = await getSupabase()
    .from("projects")
    .insert({
      name,
      description: input.description?.trim() || null,
      user_id: input.userId,
    })
    .select(PROJECT_COLUMNS)
    .single()
  if (error || !data) fail("Could not create the project", error ?? {})
  return toSummary(data as ProjectRow)
}

export async function updateProject(
  id: string,
  input: { name?: string; description?: string | null },
): Promise<ProjectSummary> {
  const patch: { name?: string; description?: string | null } = {}
  if (input.name !== undefined) {
    patch.name = requireNonEmpty(input.name, "project name")
  }
  if (input.description !== undefined) {
    patch.description = input.description?.trim() || null
  }

  const { data, error } = await getSupabase()
    .from("projects")
    .update(patch)
    .eq("id", id)
    .select(PROJECT_COLUMNS)
    .maybeSingle()
  if (error) fail("Could not save the project", error)
  if (!data) {
    throw new DataError("not-found", "This project no longer exists.")
  }
  return toSummary(data as ProjectRow)
}

/**
 * Set type + conditional language/category in ONE atomic update so a type
 * switch can never leave a stale conditional value behind (FR-006..FR-009,
 * research R2). Passing null clears the classification entirely. The DB
 * CHECK constraint remains the enforcement of record.
 */
export async function classifyProject(
  id: string,
  classification: Classification,
): Promise<void> {
  const patch: {
    type: BookType | null
    language: LanguageType[] | null
    category: CategoryType | null
    updated_at: string
  } = {
    type: null,
    language: null,
    category: null,
    updated_at: new Date().toISOString(),
  }

  if (classification !== null) {
    const { type } = classification
    patch.type = type
    if ((SCRIPTURAL_TYPES as readonly string[]).includes(type)) {
      const languages =
        "languages" in classification ? classification.languages : []
      if (languages.length === 0) {
        throw new DataError(
          "validation",
          "This type requires at least one source language.",
        )
      }
      const allowed = languageOptionsFor(type)
      if (languages.some((language) => !allowed.includes(language))) {
        throw new DataError(
          "validation",
          `That language is not available for ${type}.`,
        )
      }
      patch.language = [...new Set(languages)]
    } else if ((CATEGORIZED_TYPES as readonly string[]).includes(type)) {
      const category = "category" in classification ? classification.category : null
      if (!category || !CATEGORY_TYPES.includes(category)) {
        throw new DataError("validation", "This type requires a category.")
      }
      patch.category = category
    } else if (!BOOK_TYPES.includes(type)) {
      throw new DataError("validation", "That is not a valid project type.")
    }
  }

  const { data, error } = await getSupabase()
    .from("projects")
    .update(patch)
    .eq("id", id)
    .select("id")
    .maybeSingle()
  if (error) fail("Could not classify the project", error)
  if (!data) {
    throw new DataError("not-found", "This project no longer exists.")
  }
}

/** Assign or clear the project's single organization (FR-014). */
export async function setProjectOrganization(
  id: string,
  organizationId: string | null,
): Promise<void> {
  const { data, error } = await getSupabase()
    .from("projects")
    .update({
      organization_id: organizationId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id")
    .maybeSingle()
  if (error) fail("Could not update the project's organization", error)
  if (!data) {
    throw new DataError("not-found", "This project no longer exists.")
  }
}

// ---- Status workflow (003) ------------------------------------------------

/** While a project awaits review it is read-only except for status changes. */
export function isProjectReadOnly(status: ProjectStatus): boolean {
  return status === "ready-for-review"
}

/**
 * What still blocks a submission for review. Empty means the creator may move
 * the project to ready-for-review.
 */
export function reviewIssues(project: ProjectDetail): string[] {
  const issues: string[] = []
  if (project.licenses.length === 0) {
    issues.push("Attach and agree to at least one licence.")
  }
  if (!project.type) {
    issues.push("Classify the project (bible, book, …).")
  }
  if (!project.corpus) {
    issues.push("Attach a corpus — upload a .corpus file or a Hugging Face URL.")
  }
  return issues
}

/**
 * Legal next statuses from the project's current one. Publishing decisions
 * (into published, out of ready-for-review or published) belong to the
 * superadmin; the creator may submit for review once the requirements pass.
 */
export function allowedStatusChanges(
  project: ProjectDetail,
  isSuperadmin: boolean,
): ProjectStatus[] {
  switch (project.status) {
    case "ready-for-review":
      return isSuperadmin ? ["published", "draft"] : []
    case "published":
      return isSuperadmin ? ["draft"] : []
    default: {
      const drafting: ProjectStatus[] = ["draft", "started", "failed"]
      const next = drafting.filter((status) => status !== project.status)
      if (reviewIssues(project).length === 0) next.push("ready-for-review")
      return next
    }
  }
}

/** Human-readable reason a transition is refused, or null when it is legal. */
export function refuseStatusChange(
  project: ProjectDetail,
  next: ProjectStatus,
  isSuperadmin: boolean,
): string | null {
  if (!PROJECT_STATUSES.includes(next)) {
    return "That is not a valid project status."
  }
  if (next === project.status) return null
  if (allowedStatusChanges(project, isSuperadmin).includes(next)) return null
  if (next === "ready-for-review") {
    const issues = reviewIssues(project)
    if (issues.length > 0) {
      return `Not ready for review yet. ${issues.join(" ")}`
    }
  }
  if (
    next === "published" ||
    project.status === "ready-for-review" ||
    project.status === "published"
  ) {
    return "Only the superadmin can approve or change a project in review or published."
  }
  return `A ${project.status} project cannot move to ${next}.`
}

export async function updateProjectStatus(
  project: ProjectDetail,
  status: ProjectStatus,
  isSuperadmin: boolean,
): Promise<void> {
  const refusal = refuseStatusChange(project, status, isSuperadmin)
  if (refusal) {
    throw new DataError("validation", refusal)
  }
  const { data, error } = await getSupabase()
    .from("projects")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", project.id)
    .select("id")
    .maybeSingle()
  if (error) fail("Could not update the project status", error)
  if (!data) {
    throw new DataError("not-found", "This project no longer exists.")
  }
}

/**
 * Guard for every mutating action: a project in review is read-only. Throws
 * not-found when the project is gone so callers surface the right message.
 */
export async function assertEditable(projectId: string): Promise<void> {
  const { data, error } = await getSupabase()
    .from("projects")
    .select("status")
    .eq("id", projectId)
    .maybeSingle()
  if (error) fail("Could not load the project", error)
  if (!data) {
    throw new DataError("not-found", "This project no longer exists.")
  }
  if (isProjectReadOnly((data as { status: ProjectStatus }).status)) {
    throw new DataError(
      "validation",
      "This project is in review and read-only until the superadmin approves or returns it.",
    )
  }
}

export async function deleteProject(id: string): Promise<void> {
  const { data, error } = await getSupabase()
    .from("projects")
    .delete()
    .eq("id", id)
    .select("id")
  if (error) fail("Could not delete the project", error)
  if (!data || data.length === 0) {
    throw new DataError("not-found", "This project no longer exists.")
  }
}

// ---- Corpus links (US2) ---------------------------------------------------

export async function listCorpusOptions(projectId: string): Promise<CorpusOption[]> {
  const supabase = getSupabase()
  const [corpora, links] = await Promise.all([
    supabase
      .from("corpora")
      .select("id, name, language, type, available")
      .order("name", { ascending: true }),
    supabase.from("project_corpora").select("corpus_id").eq("project_id", projectId),
  ])
  if (corpora.error) fail("Could not load the corpus library", corpora.error)
  if (links.error) fail("Could not load linked corpora", links.error)

  const linked = new Set(
    ((links.data ?? []) as { corpus_id: string }[]).map((l) => l.corpus_id),
  )
  return (
    (corpora.data ?? []) as {
      id: string
      name: string
      language: string | null
      type: string | null
      available: boolean
    }[]
  ).map((c) => ({ ...c, alreadyLinked: linked.has(c.id) }))
}

export async function linkCorpus(projectId: string, corpusId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("project_corpora")
    .insert({ project_id: projectId, corpus_id: corpusId })
  if (error) fail("Could not link the corpus", error)
  await touchProject(projectId)
}

export async function unlinkCorpus(projectId: string, corpusId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("project_corpora")
    .delete()
    .eq("project_id", projectId)
    .eq("corpus_id", corpusId)
  if (error) fail("Could not unlink the corpus", error)
  await touchProject(projectId)
}


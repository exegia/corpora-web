// Data-access layer for the Project Workspace feature.
// Contract: specs/001-project-workspace/contracts/data-access.md
// Route modules import ONLY from this module — never supabase-js directly.

import { getSupabase } from "@/lib/supabase"

export type DataErrorCode =
  | "not-found"
  | "already-linked"
  | "validation"
  | "unavailable"
  | "unknown"

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

export interface ProjectReference {
  id: string
  projectId: string
  title: string
  authors: string | null
  year: number | null
  publication: string | null
  url: string | null
  createdAt: string
  updatedAt: string
}

export interface ProjectDetail extends ProjectSummary {
  corpora: CorpusLink[]
  references: ProjectReference[]
}

export interface CorpusOption {
  id: string
  name: string
  language: string | null
  type: string | null
  available: boolean
  alreadyLinked: boolean
}

export interface ReferenceInput {
  title: string
  authors?: string
  year?: number
  publication?: string
  url?: string
}

interface ProjectRow {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

interface ReferenceRow {
  id: string
  project_id: string
  title: string
  authors: string | null
  year: number | null
  publication: string | null
  url: string | null
  created_at: string
  updated_at: string
}

interface ProjectDetailRow extends ProjectRow {
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
  project_references: ReferenceRow[]
}

const PROJECT_COLUMNS = "id, name, description, created_at, updated_at"

const PROJECT_DETAIL_COLUMNS = `${PROJECT_COLUMNS},
  project_corpora ( corpus_id, linked_at,
    corpora ( uid, name, language, type, category, version, available ) ),
  project_references ( id, project_id, title, authors, year, publication, url, created_at, updated_at )`

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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toReference(row: ReferenceRow): ProjectReference {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    authors: row.authors,
    year: row.year,
    publication: row.publication,
    url: row.url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function requireNonEmpty(value: string, field: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    throw new DataError("validation", `A ${field} is required.`)
  }
  return trimmed
}

/** Bump projects.updated_at so list ordering reflects child activity (FR-002). */
async function touchProject(projectId: string): Promise<void> {
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
    corpora: row.project_corpora
      .map((link) => ({
        corpusId: link.corpus_id,
        linkedAt: link.linked_at,
        corpus: link.corpora,
      }))
      .sort((a, b) => a.linkedAt.localeCompare(b.linkedAt)),
    references: row.project_references
      .map(toReference)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  }
}

export async function createProject(input: {
  name: string
  description?: string
}): Promise<ProjectSummary> {
  const name = requireNonEmpty(input.name, "project name")
  const { data, error } = await getSupabase()
    .from("projects")
    .insert({ name, description: input.description?.trim() || null })
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

// ---- References (US3) -----------------------------------------------------

const REFERENCE_COLUMNS =
  "id, project_id, title, authors, year, publication, url, created_at, updated_at"

function referencePatch(input: Partial<ReferenceInput>) {
  const patch: Partial<{
    title: string
    authors: string | null
    year: number | null
    publication: string | null
    url: string | null
  }> = {}
  if (input.title !== undefined) patch.title = requireNonEmpty(input.title, "title")
  if (input.authors !== undefined) patch.authors = input.authors.trim() || null
  if (input.year !== undefined) patch.year = input.year
  if (input.publication !== undefined) {
    patch.publication = input.publication.trim() || null
  }
  if (input.url !== undefined) patch.url = input.url.trim() || null
  return patch
}

export async function createReference(
  projectId: string,
  input: ReferenceInput,
): Promise<ProjectReference> {
  const title = requireNonEmpty(input.title, "title")
  const { data, error } = await getSupabase()
    .from("project_references")
    .insert({ ...referencePatch(input), title, project_id: projectId })
    .select(REFERENCE_COLUMNS)
    .single()
  if (error || !data) fail("Could not add the reference", error ?? {})
  await touchProject(projectId)
  return toReference(data as ReferenceRow)
}

export async function updateReference(
  id: string,
  input: Partial<ReferenceInput>,
): Promise<ProjectReference> {
  const { data, error } = await getSupabase()
    .from("project_references")
    .update(referencePatch(input))
    .eq("id", id)
    .select(REFERENCE_COLUMNS)
    .maybeSingle()
  if (error) fail("Could not save the reference", error)
  if (!data) {
    throw new DataError("not-found", "This reference no longer exists.")
  }
  const reference = toReference(data as ReferenceRow)
  await touchProject(reference.projectId)
  return reference
}

export async function deleteReference(id: string): Promise<void> {
  const { data, error } = await getSupabase()
    .from("project_references")
    .delete()
    .eq("id", id)
    .select("id, project_id")
  if (error) fail("Could not delete the reference", error)
  if (!data || data.length === 0) {
    throw new DataError("not-found", "This reference no longer exists.")
  }
  await touchProject((data as { id: string; project_id: string }[])[0].project_id)
}

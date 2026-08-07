import { getSupabase } from "@/lib/supabase"
import { DataError } from "@/lib/projects/errors"
import { fail, PROJECT_COLUMNS, type ProjectRow, requireNonEmpty, toSummary } from "@/lib/projects/rows"
import { isProjectReadOnly, refuseStatusChange } from "@/lib/projects/rules"
import type { ProjectDetail, ProjectSummary } from "@/lib/projects/types"
import {
    BOOK_TYPES,
    type BookType,
    CATEGORIZED_TYPES,
    CATEGORY_TYPES,
    type CategoryType,
    type Classification,
    type LanguageType,
    languageOptionsFor,
    type ProjectStatus,
    SCRIPTURAL_TYPES,
} from "@/lib/projects/vocabulary"

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

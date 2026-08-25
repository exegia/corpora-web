import Project from "@/lib/projects"
import { getSupabase } from "@/lib/supabase"

/**
 * Attach a catalog licence with agreement (FR-010/FR-012). The agreeing user
 * comes from the seeded directory. Duplicate attachment (unique
 * project_id+licence_id, 23505) maps to "already-attached".
 */
export async function attachLicence(
  projectId: string,
  licenceId: string,
  agreedByUserId: string,
): Promise<void> {
  if (!licenceId.trim()) {
    throw new Project.Errors.DataError("validation", "Pick a licence to attach.")
  }
  if (!agreedByUserId.trim()) {
    throw new Project.Errors.DataError("validation", "An agreeing user is required.")
  }
  const { error } = await getSupabase().from("project_licences").insert({
    project_id: projectId,
    licence_id: licenceId,
    agreed_by_user_id: agreedByUserId,
  })
  if (error) {
    if (error.code === "23505") {
      throw new Project.Errors.DataError(
        "already-attached",
        "This licence is already attached to the project.",
      )
    }
    throw new Project.Errors.DataError(
      "unknown",
      `Could not attach the licence: ${error.message ?? "unexpected error"}`,
    )
  }
  await Project.Mutations.touchProject(projectId)
}

/**
 * Record agreement on an already-attached licence (FR-012). agreed_at and
 * agreed_by_user_id are written together — the table's check constraint
 * rejects either one on its own.
 */
export async function agreeLicence(
  projectId: string,
  licenceId: string,
  agreedByUserId: string,
): Promise<void> {
  if (!agreedByUserId.trim()) {
    throw new Project.Errors.DataError("validation", "An agreeing user is required.")
  }
  const { data, error } = await getSupabase()
    .from("project_licences")
    .update({
      agreed_by_user_id: agreedByUserId,
      agreed_at: new Date().toISOString(),
    })
    .eq("project_id", projectId)
    .eq("licence_id", licenceId)
    .select("licence_id")
  if (error) {
    throw new Project.Errors.DataError(
      "unknown",
      `Could not record the agreement: ${error.message ?? "unexpected error"}`,
    )
  }
  if (!data || data.length === 0) {
    throw new Project.Errors.DataError("not-found", "This licence is not attached to the project.")
  }
  await Project.Mutations.touchProject(projectId)
}

/** Detach one licence; the project's other licences are untouched (FR-013). */
export async function detachLicence(
  projectId: string,
  licenceId: string,
): Promise<void> {
  const { data, error } = await getSupabase()
    .from("project_licences")
    .delete()
    .eq("project_id", projectId)
    .eq("licence_id", licenceId)
    .select("licence_id")
  if (error) {
    throw new Project.Errors.DataError(
      "unknown",
      `Could not remove the licence: ${error.message ?? "unexpected error"}`,
    )
  }
  if (!data || data.length === 0) {
    throw new Project.Errors.DataError("not-found", "This licence is not attached to the project.")
  }
  await Project.Mutations.touchProject(projectId)
}

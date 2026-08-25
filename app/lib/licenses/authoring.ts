import Project from "@/lib/projects"
import { getSupabase } from "@/lib/supabase"
import type { LicenceCreate, LicenceUpdate } from "./types"

/** Superadmin-only creation of a catalog entry (guarded at the route action). */
export async function createLicence(input: LicenceCreate): Promise<string> {
  const id = input.id.trim()
  const title = input.title.trim()
  if (!id) {
    throw new Project.Errors.DataError("validation", "A licence identifier is required.")
  }
  if (!title) {
    throw new Project.Errors.DataError("validation", "A licence title is required.")
  }
  const { error } = await getSupabase().from("licences").insert({
    id,
    title,
    url: input.url?.trim() || null,
    family: input.family?.trim() || null,
    maintainer: input.maintainer?.trim() || null,
    status: input.status,
    domain_content: input.domains.content,
    domain_data: input.domains.data,
    domain_software: input.domains.software,
  })
  if (error) {
    if (error.code === "23505") {
      throw new Project.Errors.DataError(
        "validation",
        "A licence with this identifier already exists.",
      )
    }
    throw new Project.Errors.DataError(
      "unknown",
      `Could not create the licence: ${error.message ?? "unexpected error"}`,
    )
  }
  return id
}

/** Superadmin-only edit of a catalog entry (guarded at the route action). */
export async function updateLicence(
  id: string,
  input: LicenceUpdate,
): Promise<void> {
  const title = input.title.trim()
  if (!title) {
    throw new Project.Errors.DataError("validation", "A licence title is required.")
  }
  const { data, error } = await getSupabase()
    .from("licences")
    .update({
      title,
      url: input.url?.trim() || null,
      family: input.family?.trim() || null,
      maintainer: input.maintainer?.trim() || null,
      status: input.status,
      domain_content: input.domains.content,
      domain_data: input.domains.data,
      domain_software: input.domains.software,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id")
    .maybeSingle()
  if (error) {
    throw new Project.Errors.DataError(
      "unknown",
      `Could not update the licence: ${error.message ?? "unexpected error"}`,
    )
  }
  if (!data) {
    throw new Project.Errors.DataError("not-found", "This licence no longer exists.")
  }
}

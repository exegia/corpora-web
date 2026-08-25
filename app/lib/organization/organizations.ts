// Data-access layer for organizations (002, FR-014).
// Contract: specs/002-project-detail/contracts/data-access.md
// Pick-or-create records; not accounts or access-control boundaries.
// Route modules import ONLY from this module — never supabase-js directly.

import Project from "@/lib/projects"
import { getSupabase } from "@/lib/supabase"
import type { Organization } from "./types";
import { ORGANIZATION_COLUMNS } from "./constants";

export async function listOrganizations(): Promise<Organization[]> {
  const { data, error } = await getSupabase()
    .from("organizations")
    .select(ORGANIZATION_COLUMNS)
    .order("name", { ascending: true })
  if (error) {
    throw new Project.Errors.DataError(
      "unknown",
      `Could not load organizations: ${error.message ?? "unexpected error"}`,
    )
  }
  return (data ?? []) as Organization[]
}

export async function createOrganization(input: {
  name: string
  website?: string
}): Promise<Organization> {
  const name = input.name.trim()
  if (!name) {
    throw new Project.Errors.DataError("validation", "An organization name is required.")
  }
  const { data, error } = await getSupabase()
    .from("organizations")
    .insert({ name, website: input.website?.trim() || null })
    .select(ORGANIZATION_COLUMNS)
    .single()
  if (error || !data) {
    throw new Project.Errors.DataError(
      "unknown",
      `Could not create the organization: ${error?.message ?? "unexpected error"}`,
    )
  }
  return data as Organization
}

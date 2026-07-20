// Data-access layer for the licence catalog + project attachments (002).
// Contract: specs/002-project-detail/contracts/data-access.md
// The catalog is read-only (seeded out of band, FR-011); this module only
// reads `licences` and writes `project_licences`. Route modules import ONLY
// from this module — never supabase-js directly.

import {
  DataError,
  type LicenseStatus,
  touchProject,
} from "@/lib/projects"
import { getSupabase } from "@/lib/supabase"

export interface CatalogLicence {
  id: string
  title: string
  url: string | null
  domains: { content: boolean; data: boolean; software: boolean }
  status: LicenseStatus
  family: string | null
  maintainer: string | null
}

interface CatalogRow {
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

const CATALOG_COLUMNS =
  "id, title, url, domain_content, domain_data, domain_software, family, maintainer, status"

/** Full catalog, ordered by title. Empty until the SQL seed is loaded (FR-011). */
export async function listLicences(): Promise<CatalogLicence[]> {
  const { data, error } = await getSupabase()
    .from("licences")
    .select(CATALOG_COLUMNS)
    .order("title", { ascending: true })
  if (error) {
    throw new DataError(
      "unknown",
      `Could not load the licence catalog: ${error.message ?? "unexpected error"}`,
    )
  }
  return ((data ?? []) as CatalogRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    url: row.url,
    domains: {
      content: row.domain_content,
      data: row.domain_data,
      software: row.domain_software,
    },
    status: row.status,
    family: row.family,
    maintainer: row.maintainer,
  }))
}

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
    throw new DataError("validation", "Pick a licence to attach.")
  }
  if (!agreedByUserId.trim()) {
    throw new DataError("validation", "An agreeing user is required.")
  }
  const { error } = await getSupabase().from("project_licences").insert({
    project_id: projectId,
    licence_id: licenceId,
    agreed_by_user_id: agreedByUserId,
  })
  if (error) {
    if (error.code === "23505") {
      throw new DataError(
        "already-attached",
        "This licence is already attached to the project.",
      )
    }
    throw new DataError(
      "unknown",
      `Could not attach the licence: ${error.message ?? "unexpected error"}`,
    )
  }
  await touchProject(projectId)
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
    throw new DataError(
      "unknown",
      `Could not remove the licence: ${error.message ?? "unexpected error"}`,
    )
  }
  if (!data || data.length === 0) {
    throw new DataError("not-found", "This licence is not attached to the project.")
  }
  await touchProject(projectId)
}

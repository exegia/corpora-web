// Data-access layer for the license catalog + project attachments (002).
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

export interface CatalogLicense {
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
export async function listLicenses(): Promise<CatalogLicense[]> {
  const { data, error } = await getSupabase()
    .from("licences")
    .select(CATALOG_COLUMNS)
    .order("title", { ascending: true })
  if (error) {
    throw new DataError(
      "unknown",
      `Could not load the license catalog: ${error.message ?? "unexpected error"}`,
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
 * Attach a catalog license with agreement (FR-010/FR-012). The agreeing user
 * comes from the seeded directory. Duplicate attachment (unique (project_id, licence_id) 23505)
 * maps to "already-attached".
 */
export async function attachLicense(
  projectId: string,
  licenseId: string,
  agreedByUserId: string,
): Promise<void> {
  if (!licenseId.trim()) {
    throw new DataError("validation", "Pick a license to attach.")
  }
  if (!agreedByUserId.trim()) {
    throw new DataError("validation", "An agreeing user is required.")
  }
  const { error } = await getSupabase().from("project_licences").insert({
    project_id: projectId,
    licence_id: licenseId,
    agreed_by_user_id: agreedByUserId,
  })
  if (error) {
    if (error.code === "23505") {
      throw new DataError(
        "already-attached",
        "This license is already attached to the project.",
      )
    }
    throw new DataError(
      "unknown",
      `Could not attach the license: ${error.message ?? "unexpected error"}`,
    )
  }
  await touchProject(projectId)
}

/** Detach one license; the project's other licenses are untouched (FR-013). */
export async function detachLicense(
  projectId: string,
  licenseId: string,
): Promise<void> {
  const { data, error } = await getSupabase()
    .from("project_licences")
    .delete()
    .eq("project_id", projectId)
    .eq("licence_id", licenseId)
    .select("licence_id")
  if (error) {
    throw new DataError(
      "unknown",
      `Could not remove the license: ${error.message ?? "unexpected error"}`,
    )
  }
  if (!data || data.length === 0) {
    throw new DataError("not-found", "This license is not attached to the project.")
  }
  await touchProject(projectId)
}

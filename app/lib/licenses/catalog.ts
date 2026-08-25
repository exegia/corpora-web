// Catalog reads. The catalog is seeded out of band (FR-011); reads are open.
// Contract: specs/002-project-detail/contracts/data-access.md

import { DataError } from "@/lib/projects"
import { getSupabase } from "@/lib/supabase"
import type { CatalogLicence, CatalogRow, DetailRow, LicenceDetail } from "./types"
import { CATALOG_COLUMNS, DETAIL_COLUMNS } from "./constants";


function toCatalogLicence(row: CatalogRow): CatalogLicence {
  return {
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
  }
}

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
  return ((data ?? []) as CatalogRow[]).map(toCatalogLicence)
}

/**
 * Best-effort catalog lookup for a display label. Corpus documents store the
 * manifest's licence string ("CC BY 4.0"), while catalog ids are hyphenated
 * ("CC-BY-4.0") — so match id and title with separators normalised away.
 */
export async function findLicenceByLabel(
  label: string,
): Promise<LicenceDetail | null> {
  const normalise = (value: string) =>
    value.trim().toLowerCase().replace(/[\s_-]+/g, "-")
  const wanted = normalise(label)
  if (!wanted) return null
  const catalog = await listLicences()
  const hit = catalog.find(
    (licence) =>
      normalise(licence.id) === wanted || normalise(licence.title) === wanted,
  )
  return hit ? getLicence(hit.id) : null
}

/** One licence with its conformance + provenance fields, or null when gone. */
export async function getLicence(id: string): Promise<LicenceDetail | null> {
  const { data, error } = await getSupabase()
    .from("licences")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle()
  if (error) {
    throw new DataError(
      "unknown",
      `Could not load the licence: ${error.message ?? "unexpected error"}`,
    )
  }
  if (!data) return null
  const row = data as unknown as DetailRow
  return {
    ...toCatalogLicence(row),
    isGeneric: row.is_generic,
    legacyIds: row.legacy_ids ?? [],
    odConformance: row.od_conformance,
    osdConformance: row.osd_conformance,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    fullText: row.full_text,
  }
}

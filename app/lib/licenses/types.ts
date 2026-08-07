import type { LicenseStatus } from "@/lib/projects"

export type LicenceConformance = "not reviewed" | "approved" | "rejected"

export interface CatalogLicence {
  id: string
  title: string
  url: string | null
  domains: { content: boolean; data: boolean; software: boolean }
  status: LicenseStatus
  family: string | null
  maintainer: string | null
}

/** One catalog entry with every stored column, for the licence detail route. */
export interface LicenceDetail extends CatalogLicence {
  isGeneric: boolean
  legacyIds: string[]
  odConformance: LicenceConformance | null
  osdConformance: LicenceConformance | null
  createdAt: string
  updatedAt: string | null
  /** The downloaded/edited licence text, null until first fetched. */
  fullText: string | null
}

export interface CatalogRow {
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

export interface DetailRow extends CatalogRow {
  is_generic: boolean
  legacy_ids: string[] | null
  od_conformance: LicenceConformance | null
  osd_conformance: LicenceConformance | null
  created_at: string
  updated_at: string | null
  full_text: string | null
}

export interface LicenceUpdate {
  title: string
  url: string | null
  family: string | null
  maintainer: string | null
  status: LicenseStatus
  domains: { content: boolean; data: boolean; software: boolean }
}

export interface LicenceCreate extends LicenceUpdate {
  id: string
}

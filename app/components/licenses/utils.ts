import type { LicenceDetail } from "@/lib/licenses"
import type { LicenseStatus } from "@/lib/projects"

export const STATUS_OPTIONS: LicenseStatus[] = ["active", "retired", "superseded"]

export function domainList(licence: LicenceDetail): string[] {
  const domains: string[] = []
  if (licence.domains.content) domains.push("content")
  if (licence.domains.data) domains.push("data")
  if (licence.domains.software) domains.push("software")
  return domains
}

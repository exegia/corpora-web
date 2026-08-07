import type { AgreedLicense } from "@/components/project/license/types"
import type { CatalogLicence } from "@/lib/licenses"
import type { AttachedLicense } from "@/lib/projects"

/** An attachment is agreed only once both agreement fields are set. */
export const isAgreed = (license: AttachedLicense): license is AgreedLicense =>
    license.agreedAt !== null && license.agreedBy !== null

/** What the license is, for an attachment with no agreement to describe yet. */
export const describe = (license: AttachedLicense) =>
    [license.family, license.maintainer].filter(Boolean).join(" · ") || license.id

/** The rights-of-use domains a catalog licence can govern. */
export const DOMAINS = ["content", "data", "software"] as const

export type Domain = (typeof DOMAINS)[number]

/**
 * Content licences are what a text corpus is normally after, so that is where
 * the catalog filter starts — but the other domains are one toggle away rather
 * than filtered out of the catalog entirely.
 */
export const DEFAULT_DOMAINS: Domain[] = ["content"]

export function domainBadges(licence: CatalogLicence): Domain[] {
    return DOMAINS.filter(domain => licence.domains[domain])
}

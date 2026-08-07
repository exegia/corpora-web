import type { AgreedLicense } from "@/components/project/license/types"
import type { CatalogLicence } from "@/lib/licenses"
import type { AttachedLicense } from "@/lib/projects"

/** An attachment is agreed only once both agreement fields are set. */
export const isAgreed = (license: AttachedLicense): license is AgreedLicense =>
    license.agreedAt !== null && license.agreedBy !== null

/** What the license is, for an attachment with no agreement to describe yet. */
export const describe = (license: AttachedLicense) =>
    [license.family, license.maintainer].filter(Boolean).join(" · ") || license.id

/**
 * Only licences that govern content / text rights of use belong in the
 * catalog view — software- or data-only licences (code, art tooling, …) are
 * noise for a text corpus.
 */
export function isContentLicence(licence: CatalogLicence): boolean {
    return licence.domains.content
}

export function domainBadges(licence: CatalogLicence): string[] {
    const domains: string[] = []
    if (licence.domains.content) domains.push("content")
    if (licence.domains.data) domains.push("data")
    if (licence.domains.software) domains.push("software")
    return domains
}

/** The hover-preview body, rendered from our own generated Markdown. */
export function licenceMarkdown(licence: CatalogLicence): string {
    const lines = [
        `### ${licence.title}`,
        "",
        `**Domains:** ${domainBadges(licence).join(", ") || "—"}`,
        `**Status:** ${licence.status}`,
    ]
    if (licence.family) lines.push(`**Family:** ${licence.family}`)
    if (licence.maintainer) lines.push(`**Maintainer:** ${licence.maintainer}`)
    if (licence.url) lines.push("", `[Read the full licence](${licence.url})`)
    return lines.join("\n")
}

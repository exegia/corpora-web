import type { CatalogLicence } from "@/lib/licenses"
import type { AttachedLicense, ProjectDetail } from "@/lib/projects"

export interface SectionProps {
    project: ProjectDetail
    readOnly: boolean
    licenseCatalog: CatalogLicence[]
}

export interface TileProps {
    className?: string
}

export interface IdentityProps {
    license: AttachedLicense
    /** Second line — agreement provenance once agreed, else what the license is. */
    meta: string
}

export interface PendingCardProps {
    license: AttachedLicense
    agreedByUserId: string
    readOnly: boolean
}

/** An attachment past its agreement step — both agreement fields are set. */
export type AgreedLicense = AttachedLicense & {
    agreedAt: string
    agreedBy: NonNullable<AttachedLicense["agreedBy"]>
}

export interface AgreedRowProps {
    license: AgreedLicense
    readOnly: boolean
}

export interface CatalogSheetProps {
    catalog: CatalogLicence[]
    attachedIds: string[]
    /** Agreeing user — the project's creator until corpora-auth ships (FR-012). */
    agreedByUserId: string
    disabled?: boolean
}

export interface CatalogRowProps {
    licence: CatalogLicence
    attached: boolean
    agreedByUserId: string
}

export interface PreviewProps {
    licence: CatalogLicence
}

export interface ContentViewerProps {
    licenceId: string
    title: string
    /** `render` needs an element, not arbitrary ReactNode. */
    trigger: React.ReactElement
}

export interface ContentBodyProps {
    loading: boolean
    text: string | null
}

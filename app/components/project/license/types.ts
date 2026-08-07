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
    /**
     * The project's attachments, not just their ids — the rows show whether
     * each one has been agreed, which an id list cannot express.
     */
    attached: AttachedLicense[]
    /** Agreeing user — the project's creator until corpora-auth ships (FR-012). */
    agreedByUserId: string
    disabled?: boolean
}

export interface CatalogRowProps {
    licence: CatalogLicence
    /** The project's attachment of this licence, when it has one. */
    attachment: AttachedLicense | undefined
    onView: (licence: CatalogLicence) => void
}

export interface ContentDrawerProps {
    /**
     * Kept mounted through the closing animation, so this stays set for a beat
     * after `open` flips to false.
     */
    licence: CatalogLicence | null
    open: boolean
    onOpenChange: (open: boolean) => void
    attached: boolean
    /** Agreeing user — the project's creator until corpora-auth ships (FR-012). */
    agreedByUserId: string
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
    className?: string
}

import type { LucideIcon } from "lucide-react"
import type { useFetcher } from "react-router"
import type { ActionResult } from "@/components/project/types"
import type { CatalogLicence } from "@/lib/licenses"
import type { Organization } from "@/lib/organizations"
import type { BookType, CategoryType, LanguageType, ProjectDetail } from "@/lib/projects"

export type StatusFetcher = ReturnType<typeof useFetcher<ActionResult>>

export interface PanelProps {
    project: ProjectDetail
    licenseCatalog: CatalogLicence[]
    organizations: Organization[]
    /** Pre-auth: true when the superadmin exists in the directory (research R4). */
    superadmin: boolean
    readOnly: boolean
}

export interface ClassificationFieldProps {
    project: ProjectDetail
    readOnly: boolean
    onEdit: () => void
}

export interface OrganizationFieldProps {
    organization: ProjectDetail["organization"]
    readOnly: boolean
    onEdit: () => void
}

export interface StatusCardProps {
    project: ProjectDetail
    /** Pre-auth: true when the superadmin exists in the directory (research R4). */
    superadmin: boolean
    fetcher: StatusFetcher
}

/** One status transition, rendered as a button in the card's action stack. */
export interface StatusAction {
    label: string
    icon: React.ReactNode
    variant?: "default" | "outline"
    disabled?: boolean
    onClick: () => void
}

export interface ReviewChecklistProps {
    project: ProjectDetail
}

export interface ClassifyDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    current: {
        type: BookType | null
        languages: LanguageType[]
        category: CategoryType | null
    }
}

export interface TypeLabelProps {
    type: BookType | ""
}

export interface IconLabelProps {
    icon: LucideIcon
    text: string
}

export interface OrganizationDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    organizations: Organization[]
    currentId: string | null
}

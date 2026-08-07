import type { ProjectDetail } from "@/lib/projects"
import type { CatalogLicence } from "@/lib/licenses"
import type { Organization } from "@/lib/organizations"

export interface ProjectDetailPanelProps {
    project: ProjectDetail
    licenseCatalog: CatalogLicence[]
    organizations: Organization[]
    /** Pre-auth: true when the superadmin exists in the directory (research R4). */
    superadmin: boolean
    readOnly: boolean
}

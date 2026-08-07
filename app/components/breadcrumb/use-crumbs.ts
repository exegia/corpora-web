import { useLocation, useMatches } from "react-router"
import type { Crumb } from "@/components/breadcrumb/types"
import { isLicenceDetailData, isProjectDetailData, SECTION_LABELS } from "@/components/breadcrumb/utils"

/**
 * The trail for the current route.
 *
 * Detail labels come off `loaderData` via `useMatches` — reshaping a detail
 * loader silently degrades the trail, and nothing type-errors.
 */
export function useCrumbs(): Crumb[] {
    const { pathname } = useLocation()
    const matches = useMatches()

    const crumbs: Crumb[] = [{ label: "Dashboard", href: "/" }]
    const segments = pathname.split("/").filter(Boolean)
    if (segments.length === 0) return crumbs

    const section = segments[0]
    crumbs.push({
        label: SECTION_LABELS[section] ?? section,
        href: `/${section}`,
    })

    if (section === "project" && segments.length > 1) {
        const detail = matches.find(match => isProjectDetailData(match.loaderData))
        const project = detail && isProjectDetailData(detail.loaderData) ? detail.loaderData.project : null
        crumbs.push({ label: project?.name ?? "Project", href: pathname })
    }

    if (section === "licenses" && segments.length > 1) {
        const detail = matches.find(match => isLicenceDetailData(match.loaderData))
        const licence = detail && isLicenceDetailData(detail.loaderData) ? detail.loaderData.licence : null
        crumbs.push({ label: licence?.title ?? "License", href: pathname })
    }

    return crumbs
}

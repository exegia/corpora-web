import { Fragment } from "react"
import { Link, useLocation, useMatches } from "react-router"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const SECTION_LABELS: Record<string, string> = {
  references: "References",
  library: "Library",
  project: "Projects",
  corpus: "Corpus",
  licenses: "Licenses",
  profile: "Profile",
}

interface Crumb {
  label: string
  href: string
}

/** Route data shaped like the project detail loader's result. */
function isProjectDetailData(
  data: unknown,
): data is { project: { name: string } | null } {
  return (
    typeof data === "object" &&
    data !== null &&
    "project" in data &&
    typeof (data as { project: unknown }).project === "object"
  )
}

/** Route data shaped like the licence detail loader's result. */
function isLicenceDetailData(
  data: unknown,
): data is { licence: { title: string } | null } {
  return (
    typeof data === "object" &&
    data !== null &&
    "licence" in data &&
    typeof (data as { licence: unknown }).licence === "object"
  )
}

function useCrumbs(): Crumb[] {
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
    const detail = matches.find((match) => isProjectDetailData(match.loaderData))
    const project =
      detail && isProjectDetailData(detail.loaderData) ? detail.loaderData.project : null
    crumbs.push({ label: project?.name ?? "Project", href: pathname })
  }

  if (section === "licenses" && segments.length > 1) {
    const detail = matches.find((match) => isLicenceDetailData(match.loaderData))
    const licence =
      detail && isLicenceDetailData(detail.loaderData) ? detail.loaderData.licence : null
    crumbs.push({ label: licence?.title ?? "License", href: pathname })
  }

  return crumbs
}

const COBreadcrumb = () => {
  const crumbs = useCrumbs()

  // On the dashboard the trail is just "Dashboard" — show nothing.
  if (crumbs.length < 2) return null

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isCurrent = index === crumbs.length - 1
          return (
            <Fragment key={crumb.href}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isCurrent ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link to={crumb.href} viewTransition />}>
                    {crumb.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export default COBreadcrumb;

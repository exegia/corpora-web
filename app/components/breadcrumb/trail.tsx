import { Fragment } from "react"
import { Link } from "react-router"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useCrumbs } from "@/components/breadcrumb/use-crumbs"

/** The breadcrumb trail for the current route. */
export default function Trail() {
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


import { CardFrame, CardPanel, CardFrameHeader, CardFrameTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@exegia/corpora-ui"
import { formatDate } from "@/lib/format"
import { LicenseSheet } from "@/components/project/license-sheet"
import type { CatalogLicence } from "@/lib/licenses"
import {
    type AttachedLicense,
    type ProjectDetail
} from "@/lib/projects"
import { useFetcher } from "react-router"
import { Scale, X } from "lucide-react";

/** One attached licence, styled like the corpus card: leading icon + meta. */
function AttachedLicenseRow({ license, readOnly }: {
    license: AttachedLicense
    readOnly: boolean
}) {
    const fetcher = useFetcher<{ ok: boolean; error?: string }>()
    const busy = fetcher.state !== "idle"

    return (
        <li className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="flex min-w-0 items-center gap-3">
                <Scale
                    aria-hidden="true"
                    className="size-5 shrink-0 text-muted-foreground"
                />
                <div className="min-w-0">
                    <p className="truncate font-medium text-sm">
                        {license.title}
                        {license.status !== "active" && (
                            <Badge variant="destructive" className="ms-2">
                                {license.status}
                            </Badge>
                        )}
                    </p>
                    <p className="truncate text-muted-foreground text-xs">
                        Agreed {formatDate(license.agreedAt)} by{" "}
                        {license.agreedBy.name ?? license.agreedBy.username}
                    </p>
                    {fetcher.data?.ok === false && fetcher.data.error && (
                        <p role="alert" className="text-destructive text-xs">
                            {fetcher.data.error}
                        </p>
                    )}
                </div>
            </div>
            {!readOnly && (
                <fetcher.Form method="post" className="shrink-0">
                    <input type="hidden" name="intent" value="detach-license" />
                    <input type="hidden" name="licenseId" value={license.id} />
                    <Button type="submit" size="sm" variant="ghost" disabled={busy}>
                        <X aria-hidden="true" className="size-4" />
                        Remove
                    </Button>
                </fetcher.Form>
            )}
        </li>
    )
}

const LicensesTable = ({ project, readOnly }: { project: ProjectDetail; readOnly: boolean }) => {

  if (project.licenses.length > 0) {
    return  <ul className="mt-2 flex flex-col gap-2">
        {project.licenses.map((license) => (
            <AttachedLicenseRow
                key={license.id}
                license={license}
                readOnly={readOnly}
            />
        ))}
    </ul>
  }

    return <p className="py-2 text-muted-foreground text-sm">
            No licences attached. A licence is required before the project
            can go to review — attach one from the catalog.
        </p>
}

const LicensePickerSection = ({ project, readOnly, licenseCatalog }: { project: ProjectDetail; readOnly: boolean; licenseCatalog: CatalogLicence[] }) => {
    return (
    <CardFrame>
        <CardFrameHeader className="flex flex-row justify-between items-center">
          <CardFrameTitle render={<h2 />}>Licenses</CardFrameTitle>
          <LicenseSheet
              catalog={licenseCatalog}
              attachedIds={project.licenses.map((license) => license.id)}
              agreedByUserId={project.creator.id}
              disabled={readOnly}
          />
        </CardFrameHeader>
        <CardPanel>
            <LicensesTable project={project} readOnly={readOnly} />
        </CardPanel>
    </CardFrame>
    )
}

export default LicensePickerSection

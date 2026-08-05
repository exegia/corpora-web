import {
    CardFrame,
    CardFrameAction,
    CardFrameHeader,
    CardFrameTitle
} from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
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

/** One attached licence as a table row: leading icon + title, agreement meta. */
function AttachedLicenseRow({ license, readOnly }: {
    license: AttachedLicense
    readOnly: boolean
}) {
    const fetcher = useFetcher<{ ok: boolean; error?: string }>()
    const busy = fetcher.state !== "idle"

    return (
        <TableRow>
            {/* w-full max-w-0 is what makes `truncate` work in an auto-layout
                table: w-full hands this column the slack, max-w-0 stops the
                cell growing to fit its content instead of clipping it. */}
            <TableCell className="w-full max-w-0">
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
                        {fetcher.data?.ok === false && fetcher.data.error && (
                            <p role="alert" className="text-destructive text-xs">
                                {fetcher.data.error}
                            </p>
                        )}
                    </div>
                </div>
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">
                Agreed {formatDate(license.agreedAt)} by{" "}
                {license.agreedBy.name ?? license.agreedBy.username}
            </TableCell>
            <TableCell>
                {!readOnly && (
                    <fetcher.Form method="post" className="flex justify-end">
                        <input type="hidden" name="intent" value="detach-license" />
                        <input type="hidden" name="licenseId" value={license.id} />
                        <Button type="submit" size="sm" variant="ghost" disabled={busy}>
                            <X aria-hidden="true" className="size-4" />
                            Remove
                        </Button>
                    </fetcher.Form>
                )}
            </TableCell>
        </TableRow>
    )
}

const LicensesTable = ({ project, readOnly }: { project: ProjectDetail; readOnly: boolean }) => {
    return (
        <Table variant="card">
            <TableHeader>
                <TableRow>
                    <TableHead className="w-full">License</TableHead>
                    <TableHead>Agreed</TableHead>
                    <TableHead>
                        <span className="sr-only">Actions</span>
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {project.licenses.length > 0 ? (
                    project.licenses.map((license) => (
                        <AttachedLicenseRow
                            key={license.id}
                            license={license}
                            readOnly={readOnly}
                        />
                    ))
                ) : (
                    <TableRow>
                        <TableCell
                            colSpan={3}
                            className="whitespace-normal py-6 text-center text-muted-foreground leading-normal"
                        >
                            No licences attached. A licence is required before the
                            project can go to review — attach one from the catalog.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    )
}

const LicensePickerSection = ({ project, readOnly, licenseCatalog }: { project: ProjectDetail; readOnly: boolean; licenseCatalog: CatalogLicence[] }) => {
    return (
    <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle render={<h2 />}>Licenses</CardFrameTitle>
          <CardFrameAction>
              <LicenseSheet
                  catalog={licenseCatalog}
                  attachedIds={project.licenses.map((license) => license.id)}
                  agreedByUserId={project.creator.id}
                  disabled={readOnly}
              />
          </CardFrameAction>
        </CardFrameHeader>
        <LicensesTable project={project} readOnly={readOnly} />
    </CardFrame>
    )
}

export default LicensePickerSection

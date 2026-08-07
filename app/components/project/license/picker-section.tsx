import { Card, CardFrame, CardFrameAction, CardFrameHeader, CardFrameTitle, CardPanel } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Badge } from "@/components/ui/badge"
import { Button } from "@exegia/corpora-ui"
import { formatDate } from "@/lib/format"
import { LicenseSheet } from "@/components/project/license/license-sheet"
import { ContentViewer } from "@/components/project/license/content-viewer"
import type { CatalogLicence } from "@/lib/licenses"
import { type AttachedLicense, type ProjectDetail } from "@/lib/projects"
import { useFetcher } from "react-router"
import { Check, Eye, Scale, Trash2, X } from "lucide-react"

/** Shared leading tile, so the pending card and the agreed rows stay a family. */
function LicenseTile({ className }: { className?: string }) {
    return (
        <div
            className={`flex shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ${className ?? "size-9"}`}>
            <Scale aria-hidden="true" className="size-4.5" />
        </div>
    )
}

function LicenseIdentity({
    license,
    meta,
}: {
    license: AttachedLicense
    /** Second line — agreement provenance once agreed, else what the license is. */
    meta: string
}) {
    return (
        <div className="min-w-0">
            <p className="truncate text-sm font-medium">
                {license.title}
                {license.status !== "active" && (
                    <Badge variant="destructive" className="ms-2">
                        {license.status}
                    </Badge>
                )}
            </p>
            <p className="truncate text-xs text-muted-foreground">{meta}</p>
        </div>
    )
}

/** What the license is, for an attachment with no agreement to describe yet. */
const describe = (license: AttachedLicense) =>
    [license.family, license.maintainer].filter(Boolean).join(" · ") || license.id

/**
 * An attachment still waiting on agreement. It leads the list as a card rather
 * than a row because it is the only item asking the reader to do something.
 */
function PendingLicenseCard({
    license,
    agreedByUserId,
    readOnly,
}: {
    license: AttachedLicense
    agreedByUserId: string
    readOnly: boolean
}) {
    const agreeFetcher = useFetcher<{ ok: boolean; error?: string }>()
    const detachFetcher = useFetcher<{ ok: boolean; error?: string }>()
    const error =
        (agreeFetcher.data?.ok === false && agreeFetcher.data.error) ||
        (detachFetcher.data?.ok === false && detachFetcher.data.error)

    return (
        <li className="rounded-xl border bg-card p-3">
            <div className="flex items-center gap-3">
                <LicenseTile className="size-11" />
                <div className="min-w-0 flex-1">
                    <LicenseIdentity license={license} meta={describe(license)} />
                </div>
                {!readOnly && (
                    <div className="flex shrink-0 items-center gap-1">
                        <detachFetcher.Form method="post">
                            <input type="hidden" name="intent" value="detach-license" />
                            <input type="hidden" name="licenseId" value={license.id} />
                            <Button
                                type="submit"
                                size="sm"
                                variant="ghost"
                                aria-label={`Remove ${license.title}`}
                                disabled={detachFetcher.state !== "idle"}>
                                <X aria-hidden="true" />
                                Remove
                            </Button>
                        </detachFetcher.Form>
                        <agreeFetcher.Form method="post">
                            <input type="hidden" name="intent" value="agree-license" />
                            <input type="hidden" name="licenseId" value={license.id} />
                            <input type="hidden" name="agreedByUserId" value={agreedByUserId} />
                            <Button type="submit" size="sm" variant="outline" disabled={agreeFetcher.state !== "idle"}>
                                Review &amp; Agree
                            </Button>
                        </agreeFetcher.Form>
                    </div>
                )}
            </div>
            {error && (
                <p role="alert" className="mt-2 text-xs text-destructive">
                    {error}
                </p>
            )}
        </li>
    )
}

/** An attachment past its agreement step — both agreement fields are set. */
type AgreedLicense = AttachedLicense & {
    agreedAt: string
    agreedBy: NonNullable<AttachedLicense["agreedBy"]>
}

const isAgreed = (license: AttachedLicense): license is AgreedLicense =>
    license.agreedAt !== null && license.agreedBy !== null

/** An agreed licence: quiet row, agreement confirmed on the trailing edge. */
function AgreedLicenseRow({ license, readOnly }: { license: AgreedLicense; readOnly: boolean }) {
    const fetcher = useFetcher<{ ok: boolean; error?: string }>()
    const busy = fetcher.state !== "idle"

    return (
        <li className="group/row flex items-center gap-3 py-2">
            <LicenseTile />
            <div className="min-w-0 flex-1">
                <LicenseIdentity license={license} meta={describe(license)} />
                {fetcher.data?.ok === false && fetcher.data.error && (
                    <p role="alert" className="text-xs text-destructive">
                        {fetcher.data.error}
                    </p>
                )}
            </div>
            {/*
              The confirmation and the controls share one grid area, as the
              chevron and actions do in ProjectRow: the swap costs no reflow and
              the trailing edge is never blank.
            */}
            <div className="relative z-10 grid shrink-0 items-center justify-items-end">
                {/* pointer-events-none: it still overlaps the buttons at
                    opacity-0 and would otherwise swallow their clicks. */}
                <div className="pointer-events-none flex flex-col items-end gap-0.5 transition-opacity [grid-area:1/1] group-focus-within/row:opacity-0 group-hover/row:opacity-0">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        <Check aria-hidden="true" className="size-4 text-emerald-600 dark:text-emerald-500" />
                        Agreed
                    </p>
                    <p className="text-xs whitespace-nowrap text-muted-foreground">
                        {formatDate(license.agreedAt)} by {license.agreedBy.name ?? license.agreedBy.username}
                    </p>
                </div>
                {/* Revealed by the same triggers that hide the confirmation —
                    including keyboard focus, the only way to reach these
                    without a pointer. */}
                <div className="flex items-center gap-1 opacity-0 transition-opacity [grid-area:1/1] group-focus-within/row:opacity-100 group-hover/row:opacity-100">
                    <ContentViewer
                        licenceId={license.id}
                        title={license.title}
                        trigger={
                            <Button aria-label={`View ${license.title}`} size="sm" variant="ghost">
                                <Eye />
                                View
                            </Button>
                        }
                    />
                    {!readOnly && (
                        <fetcher.Form method="post">
                            <input type="hidden" name="intent" value="detach-license" />
                            <input type="hidden" name="licenseId" value={license.id} />
                            <Button
                                type="submit"
                                aria-label={`Remove ${license.title}`}
                                size="icon-sm"
                                variant="destructive-outline"
                                disabled={busy}>
                                <Trash2 />
                            </Button>
                        </fetcher.Form>
                    )}
                </div>
            </div>
        </li>
    )
}

const PickerSection = ({
    project,
    readOnly,
    licenseCatalog,
}: {
    project: ProjectDetail
    readOnly: boolean
    licenseCatalog: CatalogLicence[]
}) => {
    const pending = project.licenses.filter(license => !isAgreed(license))
    const agreed = project.licenses.filter(isAgreed)

    return (
        <CardFrame>
            <CardFrameHeader>
                <CardFrameTitle render={<h2 />}>Licenses</CardFrameTitle>
                <CardFrameAction>
                    <LicenseSheet
                        catalog={licenseCatalog}
                        attachedIds={project.licenses.map(license => license.id)}
                        agreedByUserId={project.creator.id}
                        disabled={readOnly}
                    />
                </CardFrameAction>
            </CardFrameHeader>
            <Card>
                <CardPanel>
                    {project.licenses.length === 0 ? (
                        <Empty className="py-8 md:py-10">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Scale />
                                </EmptyMedia>
                                <EmptyTitle>No licences attached</EmptyTitle>
                                <EmptyDescription>
                                    A licence is required before the project can go to review — attach one from the
                                    catalog.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {pending.length > 0 && (
                                <ul className="flex flex-col gap-2">
                                    {pending.map(license => (
                                        <PendingLicenseCard
                                            key={license.id}
                                            license={license}
                                            agreedByUserId={project.creator.id}
                                            readOnly={readOnly}
                                        />
                                    ))}
                                </ul>
                            )}
                            {agreed.length > 0 && (
                                <ul className="flex flex-col divide-y">
                                    {agreed.map(license => (
                                        <AgreedLicenseRow key={license.id} license={license} readOnly={readOnly} />
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </CardPanel>
            </Card>
        </CardFrame>
    )
}

export default PickerSection

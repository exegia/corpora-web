import { Check, Paperclip, Plus, SearchIcon, X } from "lucide-react"
import { marked } from "marked"
import { useMemo, useState } from "react"
import { useFetcher } from "react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { PreviewCard, PreviewCardPopup, PreviewCardTrigger } from "@/components/ui/preview-card"
import {
    Sheet,
    SheetDescription,
    SheetHeader,
    SheetPanel,
    SheetPopup,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import type { CatalogLicence } from "@/lib/licenses"

/**
 * Only licences that govern content / text rights of use belong in this
 * catalog view — software- or data-only licences (code, art tooling, …) are
 * noise for a text corpus.
 */
export function isContentLicence(licence: CatalogLicence): boolean {
    return licence.domains.content
}

function domainBadges(licence: CatalogLicence) {
    const domains: string[] = []
    if (licence.domains.content) domains.push("content")
    if (licence.domains.data) domains.push("data")
    if (licence.domains.software) domains.push("software")
    return domains
}

function licenceMarkdown(licence: CatalogLicence): string {
    const lines = [
        `### ${licence.title}`,
        "",
        `**Domains:** ${domainBadges(licence).join(", ") || "—"}`,
        `**Status:** ${licence.status}`,
    ]
    if (licence.family) lines.push(`**Family:** ${licence.family}`)
    if (licence.maintainer) lines.push(`**Maintainer:** ${licence.maintainer}`)
    if (licence.url) lines.push("", `[Read the full licence](${licence.url})`)
    return lines.join("\n")
}

function LicencePreview({ licence }: { licence: CatalogLicence }) {
    const html = useMemo(() => marked.parse(licenceMarkdown(licence), { async: false }), [licence])
    return (
        <div
            className="[&_a]:underline [&_a]:underline-offset-2 [&_h3]:text-base [&_h3]:font-semibold [&_p]:mt-2 first:[&_p]:mt-0"
            // Our own generated Markdown — no user-provided HTML flows through here.
            dangerouslySetInnerHTML={{ __html: html }}
        />
    )
}

function CatalogRow({
    licence,
    attached,
    agreedByUserId,
}: {
    licence: CatalogLicence
    attached: boolean
    agreedByUserId: string
}) {
    const fetcher = useFetcher<{ ok: boolean; error?: string }>()
    const [confirming, setConfirming] = useState(false)
    const busy = fetcher.state !== "idle"
    const discouraged = licence.status !== "active"

    return (
        <li className="flex flex-col gap-2 py-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <PreviewCard>
                        <PreviewCardTrigger
                            render={
                                licence.url ? (
                                    <a
                                        href={licence.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sm font-medium underline-offset-2 hover:underline"
                                    />
                                ) : (
                                    <span className="text-sm font-medium" tabIndex={0} />
                                )
                            }>
                            {licence.title}
                        </PreviewCardTrigger>
                        <PreviewCardPopup className="w-72">
                            <LicencePreview licence={licence} />
                        </PreviewCardPopup>
                    </PreviewCard>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                        {discouraged && <Badge variant="destructive">{licence.status}</Badge>}
                        {domainBadges(licence).map(domain => (
                            <Badge key={domain} variant="outline">
                                {domain}
                            </Badge>
                        ))}
                        {licence.family && <span>{licence.family}</span>}
                    </p>
                    {fetcher.data?.ok === false && fetcher.data.error && (
                        <p role="alert" className="text-xs text-destructive">
                            {fetcher.data.error}
                        </p>
                    )}
                </div>
                {attached ? (
                    <Badge variant="secondary">Attached</Badge>
                ) : confirming ? (
                    <fetcher.Form
                        method="post"
                        onSubmit={() => setConfirming(false)}
                        className="flex shrink-0 items-center gap-1">
                        <input type="hidden" name="intent" value="attach-license" />
                        <input type="hidden" name="licenseId" value={licence.id} />
                        <input type="hidden" name="agreedByUserId" value={agreedByUserId} />
                        <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                            <X aria-hidden="true" className="size-4" />
                            Cancel
                        </Button>
                        <Button type="submit" size="sm" disabled={busy}>
                            <Check aria-hidden="true" className="size-4" />
                            Agree & attach
                        </Button>
                    </fetcher.Form>
                ) : (
                    <Button type="button" size="sm" variant="outline" onClick={() => setConfirming(true)}>
                        <Paperclip aria-hidden="true" className="size-4" />
                        Attach
                    </Button>
                )}
            </div>
            {confirming && !attached && (
                <p className="text-xs text-muted-foreground">
                    By attaching, you agree to apply “{licence.title}” to this project. The agreement time and your user
                    are recorded.
                </p>
            )}
        </li>
    )
}

export interface LicenseSheetProps {
    catalog: CatalogLicence[]
    attachedIds: string[]
    /** Agreeing user — the project's creator until corpora-auth ships (FR-012). */
    agreedByUserId: string
    disabled?: boolean
}

/**
 * Browse the content-licence catalog in a right inset sheet (no backdrop),
 * search it, preview each licence, and attach with an explicit agreement step.
 */
export default function LicenseSheet({ catalog, attachedIds, agreedByUserId, disabled }: LicenseSheetProps) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState("")
    const attached = new Set(attachedIds)

    const contentCatalog = catalog.filter(isContentLicence)
    const needle = query.trim().toLowerCase()
    const results = needle
        ? contentCatalog.filter(licence =>
              [licence.title, licence.id, licence.family, licence.maintainer]
                  .filter(Boolean)
                  .some(field => String(field).toLowerCase().includes(needle))
          )
        : contentCatalog

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button aria-label="Add licence" size="sm" variant="outline" disabled={disabled} />}>
                <Plus aria-hidden="true" className="size-4" />
                Add
            </SheetTrigger>
            <SheetPopup side="right" variant="inset" showBackdrop={false}>
                <SheetHeader>
                    <SheetTitle>Attach a licence</SheetTitle>
                    <SheetDescription>
                        Content and text rights-of-use licences from the catalog. Hover a title to preview it; retired
                        or superseded licences are marked.
                    </SheetDescription>
                    <InputGroup>
                        <InputGroupInput
                            aria-label="Search licences"
                            placeholder="Search licences…"
                            type="search"
                            value={query}
                            onChange={event => setQuery(event.currentTarget.value)}
                        />
                        <InputGroupAddon>
                            <SearchIcon aria-hidden="true" />
                        </InputGroupAddon>
                    </InputGroup>
                </SheetHeader>
                <SheetPanel>
                    {contentCatalog.length === 0 ? (
                        <p className="py-4 text-sm text-muted-foreground">
                            No content licences are available yet — the licence catalog has not been seeded. The rest of
                            the project keeps working without one.
                        </p>
                    ) : results.length === 0 ? (
                        <p className="py-4 text-sm text-muted-foreground">No licence matches “{query}”.</p>
                    ) : (
                        <ul className="divide-y">
                            {results.map(licence => (
                                <CatalogRow
                                    key={licence.id}
                                    licence={licence}
                                    attached={attached.has(licence.id)}
                                    agreedByUserId={agreedByUserId}
                                />
                            ))}
                        </ul>
                    )}
                </SheetPanel>
            </SheetPopup>
        </Sheet>
    )
}

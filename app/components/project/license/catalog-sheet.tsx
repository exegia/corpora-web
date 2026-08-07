import { Plus, SearchIcon } from "lucide-react"
import { Fragment, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Drawer,
    DrawerDescription,
    DrawerHeader,
    DrawerPanel,
    DrawerPopup,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { ToggleGroup, ToggleGroupItem, ToggleGroupSeparator } from "@/components/ui/toggle-group"
import CatalogRow from "@/components/project/license/catalog-row"
import ContentDrawer from "@/components/project/license/content-drawer"
import type { CatalogSheetProps } from "@/components/project/license/types"
import { DEFAULT_DOMAINS, DOMAINS, type Domain } from "@/components/project/license/utils"
import type { CatalogLicence } from "@/lib/licenses"

/**
 * Browse the licence catalog in a right inset drawer: filter it by domain,
 * search it, then open a licence to read it in full and agree to it.
 *
 * A drawer rather than a sheet because the viewer stacks *on top of* this
 * panel — the scale-and-peek stacking is a Base UI drawer behaviour, and a
 * nested drawer inside a sheet gets none of it.
 */
export default function CatalogSheet({ catalog, attached, agreedByUserId, disabled }: CatalogSheetProps) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState("")
    const [domains, setDomains] = useState<Domain[]>(DEFAULT_DOMAINS)
    // Held past `viewerOpen` so the licence still renders through the drawer's
    // closing animation instead of blanking out mid-slide.
    const [viewing, setViewing] = useState<CatalogLicence | null>(null)
    const [viewerOpen, setViewerOpen] = useState(false)
    const attachments = new Map(attached.map(licence => [licence.id, licence]))

    // An empty selection is "no domain filter" rather than "no results" — the
    // toggle group lets every item be unpressed, and an empty list would read
    // as a broken catalog.
    const inDomain = (licence: CatalogLicence) =>
        domains.length === 0 || domains.some(domain => licence.domains[domain])

    const needle = query.trim().toLowerCase()
    const searched = catalog.filter(
        licence =>
            !needle ||
            [licence.title, licence.id, licence.family, licence.maintainer]
                .filter(Boolean)
                .some(field => String(field).toLowerCase().includes(needle))
    )
    const results = searched.filter(inDomain)

    // Counted against the search but *not* against the domain selection, so
    // each number answers "how many would this toggle add", not "how many are
    // showing". Licences span domains, so these overlap and do not sum to the
    // result count.
    const counts = Object.fromEntries(
        DOMAINS.map(domain => [domain, searched.filter(licence => licence.domains[domain]).length])
    ) as Record<Domain, number>

    return (
        <Drawer open={open} onOpenChange={setOpen} position="right">
            <DrawerTrigger render={<Button aria-label="Add licence" size="sm" variant="outline" disabled={disabled} />}>
                <Plus aria-hidden="true" className="size-4" />
                Add
            </DrawerTrigger>
            <DrawerPopup variant="inset">
                <DrawerHeader>
                    <DrawerTitle>Attach a licence</DrawerTitle>
                    <DrawerDescription>
                        Filter and search the rights-of-use catalog, then open a licence to read it in full and agree to
                        it. Retired or superseded licences are marked.
                    </DrawerDescription>
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
                    <ToggleGroup
                        multiple
                        aria-label="Filter by licence domain"
                        size="sm"
                        variant="outline"
                        value={domains}
                        onValueChange={value => setDomains(value as Domain[])}>
                        {DOMAINS.map((domain, index) => (
                            <Fragment key={domain}>
                                {index > 0 && <ToggleGroupSeparator />}
                                <ToggleGroupItem
                                    value={domain}
                                    // Without this the label and the badge run
                                    // together into "content88". The count is
                                    // worth announcing, so spell it out rather
                                    // than hiding the badge.
                                    aria-label={`${domain}, ${counts[domain]} ${
                                        counts[domain] === 1 ? "licence" : "licences"
                                    }`}>
                                    {domain}
                                    <Badge variant="secondary" className="tabular-nums">
                                        {counts[domain]}
                                    </Badge>
                                </ToggleGroupItem>
                            </Fragment>
                        ))}
                    </ToggleGroup>
                </DrawerHeader>
                <DrawerPanel>
                    {catalog.length === 0 ? (
                        <p className="py-4 text-sm text-muted-foreground">
                            No licences are available yet — the licence catalog has not been seeded. The rest of the
                            project keeps working without one.
                        </p>
                    ) : results.length === 0 ? (
                        <p className="py-4 text-sm text-muted-foreground">
                            {needle ? `No licence matches “${query}”.` : "No licence matches this filter."}
                        </p>
                    ) : (
                        <ul className="divide-y">
                            {results.map(licence => (
                                <CatalogRow
                                    key={licence.id}
                                    licence={licence}
                                    attachment={attachments.get(licence.id)}
                                    onView={selected => {
                                        setViewing(selected)
                                        setViewerOpen(true)
                                    }}
                                />
                            ))}
                        </ul>
                    )}
                </DrawerPanel>
                {/* One viewer for the whole catalog, not one per row — the
                    catalog runs to hundreds of licences. */}
                <ContentDrawer
                    licence={viewing}
                    open={viewerOpen}
                    onOpenChange={setViewerOpen}
                    attached={!!viewing && attachments.has(viewing.id)}
                    agreedByUserId={agreedByUserId}
                />
            </DrawerPopup>
        </Drawer>
    )
}

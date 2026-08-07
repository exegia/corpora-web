import { Plus, SearchIcon } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import {
    Sheet,
    SheetDescription,
    SheetHeader,
    SheetPanel,
    SheetPopup,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import CatalogRow from "@/components/project/license/catalog-row"
import type { CatalogSheetProps } from "@/components/project/license/types"
import { isContentLicence } from "@/components/project/license/utils"

/**
 * Browse the content-licence catalog in a right inset sheet (no backdrop),
 * search it, preview each licence, and attach with an explicit agreement step.
 */
export default function CatalogSheet({ catalog, attachedIds, agreedByUserId, disabled }: CatalogSheetProps) {
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

import { SearchIcon } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"
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
import ImportRow from "@/components/project/corpus/import-row"
import type { ImportSheetProps } from "@/components/project/corpus/types"

/**
 * Browse the corpus library in a right inset sheet (mirrors the licence sheet):
 * search the documents loaded from the db and import one into the project.
 */
export default function ImportSheet({ documents, attachedId, disabled }: ImportSheetProps) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState("")

    const needle = query.trim().toLowerCase()
    const results = needle
        ? documents.filter(document =>
              [document.name, document.filename, document.source]
                  .filter(Boolean)
                  .some(field => String(field).toLowerCase().includes(needle))
          )
        : documents

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button size="sm" variant="outline" disabled={disabled} />}>
                Import corpus
            </SheetTrigger>
            <SheetPopup side="right" variant="inset" showBackdrop={false}>
                <SheetHeader>
                    <SheetTitle>Import a corpus</SheetTitle>
                    <SheetDescription>
                        Pick the document this project publishes from the corpus library.
                    </SheetDescription>
                    <InputGroup>
                        <InputGroupInput
                            aria-label="Search corpora"
                            placeholder="Search corpora…"
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
                    {documents.length === 0 ? (
                        <p className="py-4 text-sm text-muted-foreground">
                            The corpus library is empty. Upload a .corpus document on the{" "}
                            <Link to="/corpus" className="underline underline-offset-2" viewTransition>
                                Corpus
                            </Link>{" "}
                            page first.
                        </p>
                    ) : results.length === 0 ? (
                        <p className="py-4 text-sm text-muted-foreground">No corpus matches “{query}”.</p>
                    ) : (
                        <ul className="divide-y">
                            {results.map(document => (
                                <ImportRow key={document.id} document={document} attachedId={attachedId} />
                            ))}
                        </ul>
                    )}
                </SheetPanel>
            </SheetPopup>
        </Sheet>
    )
}

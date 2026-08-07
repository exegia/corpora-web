import { useFetcher } from "react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ListRowProps } from "@/components/project/corpus/types"
import type { ActionResult } from "@/components/project/types"

/** One referenced library corpus, with its unlink control. */
export default function ListRow({ link, readOnly }: ListRowProps) {
    const fetcher = useFetcher<ActionResult>()
    const busy = fetcher.state !== "idle"
    const stale = link.corpus === null || !link.corpus.available

    return (
        <li className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium">
                    <span className="truncate">{link.corpus?.name ?? "Removed corpus"}</span>
                    {stale && <Badge variant="secondary">Unavailable</Badge>}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                    {link.corpus
                        ? [link.corpus.language, link.corpus.type, `v${link.corpus.version}`]
                              .filter(Boolean)
                              .join(" · ")
                        : "This corpus is no longer in your library."}
                </p>
                {fetcher.data?.ok === false && fetcher.data.error && (
                    <p role="alert" className="text-xs text-destructive">
                        {fetcher.data.error}
                    </p>
                )}
            </div>
            {!readOnly && (
                <fetcher.Form method="post">
                    <input type="hidden" name="intent" value="unlink-corpus" />
                    <input type="hidden" name="corpusId" value={link.corpusId} />
                    <Button type="submit" size="sm" variant="ghost" disabled={busy}>
                        Remove
                    </Button>
                </fetcher.Form>
            )}
        </li>
    )
}

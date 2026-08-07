import { useFetcher } from "react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ImportRowProps } from "@/components/project/corpus/types"
import type { ActionResult } from "@/components/project/types"
import { formatRelativeTime } from "@/lib/format"

/** One library document in the import sheet, with its attach control. */
export default function ImportRow({ document, attachedId }: ImportRowProps) {
    const fetcher = useFetcher<ActionResult>()
    const busy = fetcher.state !== "idle"
    const attached = document.id === attachedId

    return (
        <li className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
                <p className="truncate text-sm font-medium">{document.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                    {[
                        document.source === "huggingface" ? "Hugging Face" : "Uploaded file",
                        document.commits.length > 0 ? `${document.commits.length} commits` : null,
                        formatRelativeTime(document.uploadedAt),
                    ]
                        .filter(Boolean)
                        .join(" · ")}
                </p>
                {fetcher.data?.ok === false && fetcher.data.error && (
                    <p role="alert" className="text-xs text-destructive">
                        {fetcher.data.error}
                    </p>
                )}
            </div>
            {attached ? (
                <Badge variant="secondary">Imported</Badge>
            ) : (
                <fetcher.Form method="post">
                    <input type="hidden" name="intent" value="attach-corpus" />
                    <input type="hidden" name="documentId" value={document.id} />
                    <Button type="submit" size="sm" variant="outline" disabled={busy}>
                        Import
                    </Button>
                </fetcher.Form>
            )}
        </li>
    )
}

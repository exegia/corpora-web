import { useFetcher } from "react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { LinkRowProps } from "@/components/project/corpus/types"
import type { ActionResult } from "@/components/project/types"

/** One library corpus offered for reference, with its link control. */
export default function LinkRow({ option }: LinkRowProps) {
    const fetcher = useFetcher<ActionResult>()
    const busy = fetcher.state !== "idle"

    return (
        <li className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
                <p className="truncate text-sm font-medium">{option.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                    {[option.language, option.type].filter(Boolean).join(" · ") || "—"}
                </p>
                {fetcher.data?.ok === false && fetcher.data.error && (
                    <p role="alert" className="text-xs text-destructive">
                        {fetcher.data.error}
                    </p>
                )}
            </div>
            {option.alreadyLinked ? (
                <Badge variant="secondary">Referenced</Badge>
            ) : !option.available ? (
                <Badge variant="secondary">Unavailable</Badge>
            ) : (
                <fetcher.Form method="post">
                    <input type="hidden" name="intent" value="link-corpus" />
                    <input type="hidden" name="corpusId" value={option.id} />
                    <Button type="submit" size="sm" variant="outline" disabled={busy}>
                        Reference
                    </Button>
                </fetcher.Form>
            )}
        </li>
    )
}

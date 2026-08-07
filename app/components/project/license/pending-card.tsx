import { X } from "lucide-react"
import { useFetcher } from "react-router"
import { Button } from "@exegia/corpora-ui"
import Identity from "@/components/project/license/identity"
import Tile from "@/components/project/license/tile"
import type { PendingCardProps } from "@/components/project/license/types"
import { describe } from "@/components/project/license/utils"
import type { ActionResult } from "@/components/project/types"

/**
 * An attachment still waiting on agreement. It leads the list as a card rather
 * than a row because it is the only item asking the reader to do something.
 */
export default function PendingCard({ license, agreedByUserId, readOnly }: PendingCardProps) {
    const agreeFetcher = useFetcher<ActionResult>()
    const detachFetcher = useFetcher<ActionResult>()
    const error =
        (agreeFetcher.data?.ok === false && agreeFetcher.data.error) ||
        (detachFetcher.data?.ok === false && detachFetcher.data.error)

    return (
        <li className="rounded-xl border bg-card p-3">
            <div className="flex items-center gap-3">
                <Tile className="size-11" />
                <div className="min-w-0 flex-1">
                    <Identity license={license} meta={describe(license)} />
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

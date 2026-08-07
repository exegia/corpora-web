import { Check, Eye, Trash2 } from "lucide-react"
import { useFetcher } from "react-router"
import { Button } from "@exegia/corpora-ui"
import ContentViewer from "@/components/project/license/content-viewer"
import Identity from "@/components/project/license/identity"
import Tile from "@/components/project/license/tile"
import type { AgreedRowProps } from "@/components/project/license/types"
import { describe } from "@/components/project/license/utils"
import type { ActionResult } from "@/components/project/types"
import { formatDate } from "@/lib/format"

/** An agreed licence: quiet row, agreement confirmed on the trailing edge. */
export default function AgreedRow({ license, readOnly }: AgreedRowProps) {
    const fetcher = useFetcher<ActionResult>()
    const busy = fetcher.state !== "idle"

    return (
        <li className="group/row flex items-center gap-3 py-2">
            <Tile />
            <div className="min-w-0 flex-1">
                <Identity license={license} meta={describe(license)} />
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

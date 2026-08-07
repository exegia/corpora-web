import { Check, Eye, X } from "lucide-react"
import { useFetcher } from "react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { CatalogRowProps } from "@/components/project/license/types"
import { domainBadges } from "@/components/project/license/utils"
import type { ActionResult } from "@/components/project/types"

/** One catalog licence: open it to read and agree, or detach it if attached. */
export default function CatalogRow({ licence, attachment, onView }: CatalogRowProps) {
    const detachFetcher = useFetcher<ActionResult>()
    const discouraged = licence.status !== "active"
    // Attached is not agreed: the DB pairs agreed_at with agreed_by under a
    // check constraint, and `agreeLicence` can settle an older attachment.
    const agreed = attachment?.agreedAt != null

    return (
        <li className="flex items-start justify-between gap-3 py-3">
            <div className="min-w-0">
                <p className="text-sm font-medium">{licence.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                    {discouraged && <Badge variant="destructive">{licence.status}</Badge>}
                    {domainBadges(licence).map(domain => (
                        <Badge key={domain} variant="outline">
                            {domain}
                        </Badge>
                    ))}
                    {licence.family && <span>{licence.family}</span>}
                </p>
            </div>
            {/*
                Titles are not unique — a retired licence keeps the title of the
                id that replaced it (two rows read "GNU General Public License
                v2.0 only", told apart only by a badge) — and an attached
                licence has its own control on the page behind this drawer. The
                SPDX id separates both cases; the visible verb still leads, as
                WCAG 2.5.3 (Label in Name) requires.
            */}
            <div className="flex shrink-0 flex-col items-end gap-1">
                {attachment ? (
                    <detachFetcher.Form method="post">
                        <input type="hidden" name="intent" value="detach-license" />
                        <input type="hidden" name="licenseId" value={licence.id} />
                        <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            aria-label={`Remove ${licence.title} (${licence.id})`}
                            disabled={detachFetcher.state !== "idle"}>
                            <X aria-hidden="true" />
                            Remove
                        </Button>
                    </detachFetcher.Form>
                ) : (
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-label={`View ${licence.title} (${licence.id})`}
                        onClick={() => onView(licence)}>
                        <Eye aria-hidden="true" />
                        View
                    </Button>
                )}
                {agreed && (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        <Check aria-hidden="true" className="size-4 text-emerald-600 dark:text-emerald-500" />
                        Agreed
                    </p>
                )}
                {detachFetcher.data?.ok === false && detachFetcher.data.error && (
                    <p role="alert" className="text-xs text-destructive">
                        {detachFetcher.data.error}
                    </p>
                )}
            </div>
        </li>
    )
}

import { Check, Paperclip, X } from "lucide-react"
import { useState } from "react"
import { useFetcher } from "react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PreviewCard, PreviewCardPopup, PreviewCardTrigger } from "@/components/ui/preview-card"
import Preview from "@/components/project/license/preview"
import type { CatalogRowProps } from "@/components/project/license/types"
import { domainBadges } from "@/components/project/license/utils"
import type { ActionResult } from "@/components/project/types"

/** One catalog licence, with its two-step agree-and-attach control. */
export default function CatalogRow({ licence, attached, agreedByUserId }: CatalogRowProps) {
    const fetcher = useFetcher<ActionResult>()
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
                            <Preview licence={licence} />
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

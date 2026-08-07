import { Check } from "lucide-react"
import { useEffect, useRef } from "react"
import { useFetcher } from "react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Drawer,
    DrawerClose,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerPanel,
    DrawerPopup,
    DrawerTitle,
} from "@/components/ui/drawer"
import ContentBody from "@/components/project/license/content-body"
import type { ContentDrawerProps } from "@/components/project/license/types"
import { useContentText } from "@/components/project/license/use-content-text"
import type { ActionResult } from "@/components/project/types"

/**
 * The full licence text stacked over the catalog drawer, and the place where
 * the agreement is made: reading the licence and accepting it are one step, so
 * nobody attaches a licence they were never shown.
 *
 * Rendered inside the catalog's `DrawerPopup` — Base UI reads nesting from the
 * React tree, which is what drives the parent's scale-and-peek stacking.
 */
export default function ContentDrawer({ licence, open, onOpenChange, attached, agreedByUserId }: ContentDrawerProps) {
    const fetcher = useFetcher<ActionResult>()
    const submitted = useRef(false)
    const busy = fetcher.state !== "idle"
    const { text, loading } = useContentText(licence?.id ?? "", open && !!licence)

    // The row behind flips to "Attached" on revalidation, but nothing else
    // would dismiss the viewer. Guarded by the ref so a stale `ok` from a
    // previous attach cannot slam the drawer shut the moment it reopens.
    useEffect(() => {
        if (!submitted.current || busy || fetcher.data?.ok !== true) return
        submitted.current = false
        onOpenChange(false)
    }, [busy, fetcher.data, onOpenChange])

    return (
        <Drawer open={open} onOpenChange={onOpenChange} position="right">
            <DrawerPopup variant="inset">
                <DrawerHeader>
                    <DrawerTitle>{licence?.title ?? "Licence"}</DrawerTitle>
                    <DrawerDescription>
                        {attached
                            ? "Already attached to this project."
                            : "Read the licence in full, then agree to apply it to this project. The agreement time and your user are recorded."}
                    </DrawerDescription>
                </DrawerHeader>
                <DrawerPanel>
                    <ContentBody loading={loading} text={text} />
                </DrawerPanel>
                <DrawerFooter>
                    {fetcher.data?.ok === false && fetcher.data.error && (
                        <p role="alert" className="text-xs text-destructive sm:me-auto">
                            {fetcher.data.error}
                        </p>
                    )}
                    <DrawerClose render={<Button variant="outline" />}>{attached ? "Close" : "Back"}</DrawerClose>
                    {attached ? (
                        <Badge variant="secondary" className="self-center">
                            Attached
                        </Badge>
                    ) : (
                        licence && (
                            <fetcher.Form
                                method="post"
                                onSubmit={() => {
                                    submitted.current = true
                                }}>
                                <input type="hidden" name="intent" value="attach-license" />
                                <input type="hidden" name="licenseId" value={licence.id} />
                                <input type="hidden" name="agreedByUserId" value={agreedByUserId} />
                                <Button type="submit" disabled={busy} className="w-full">
                                    <Check aria-hidden="true" />
                                    Agree &amp; attach
                                </Button>
                            </fetcher.Form>
                        )
                    )}
                </DrawerFooter>
            </DrawerPopup>
        </Drawer>
    )
}

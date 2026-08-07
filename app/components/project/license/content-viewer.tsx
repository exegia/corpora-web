import { useCallback, useEffect, useState } from "react"
import { useRemarkSync } from "react-remark"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogPanel,
    DialogPopup,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { getLicence, resolveLicenceText } from "@/lib/licenses"

/**
 * The licence body, read-only, in a modal.
 *
 * The text is not on the project's loader — it is a per-licence read plus, on a
 * first view, a download from SPDX — so it is fetched when the dialog opens and
 * never on the way to painting the project page.
 */
export function ContentViewer({
    licenceId,
    title,
    trigger,
}: {
    licenceId: string
    title: string
    /** `render` needs an element, not arbitrary ReactNode. */
    trigger: React.ReactElement
}) {
    const [open, setOpen] = useState(false)
    const [text, setText] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const fetchLicense = useCallback(async () => {
        if (!open || text !== null) return
        setLoading(true)
        const response = await getLicence(licenceId)
        const resolved = await resolveLicenceText(response)
        setText(resolved)
        setLoading(false)
    }, [open, licenceId, text])

    useEffect(() => {
        fetchLicense().then()
    }, [fetchLicense])

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={trigger} />
            <DialogPopup className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <DialogContent>
                    <DialogPanel>
                        <LicenceBody loading={loading} text={text} />
                    </DialogPanel>
                </DialogContent>
                <DialogFooter>
                    <DialogClose render={<Button variant="outline" />}>Close</DialogClose>
                </DialogFooter>
            </DialogPopup>
        </Dialog>
    )
}

/** Split out so the Markdown hook runs only against a settled string. */
function LicenceBody({ loading, text }: { loading: boolean; text: string | null }) {
    // Synchronous render — the stored text carries no async remark plugins.
    const rendered = useRemarkSync(text ?? "")

    if (loading) {
        return (
            <p
                role="status"
                aria-label="Loading the licence text"
                className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Spinner />
                Loading the licence text…
            </p>
        )
    }
    if (!text) {
        return (
            <p className="py-6 text-sm text-muted-foreground">
                The full text of this licence could not be retrieved. Open the licence in the catalog to add it.
            </p>
        )
    }
    return (
        <div className="max-h-[60vh] overflow-y-auto text-sm whitespace-pre-wrap [&_a]:underline [&_a]:underline-offset-2 [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:font-semibold [&_p]:mt-2">
            {rendered}
        </div>
    )
}

export default ContentViewer

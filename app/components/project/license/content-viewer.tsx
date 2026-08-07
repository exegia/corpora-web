import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
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
import ContentBody from "@/components/project/license/content-body"
import type { ContentViewerProps } from "@/components/project/license/types"
import { getLicence, resolveLicenceText } from "@/lib/licenses"

/**
 * The licence body, read-only, in a modal.
 *
 * The text is not on the project's loader — it is a per-licence read plus, on a
 * first view, a download from SPDX — so it is fetched when the dialog opens and
 * never on the way to painting the project page.
 */
export default function ContentViewer({ licenceId, title, trigger }: ContentViewerProps) {
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
                        <ContentBody loading={loading} text={text} />
                    </DialogPanel>
                </DialogContent>
                <DialogFooter>
                    <DialogClose render={<Button variant="outline" />}>Close</DialogClose>
                </DialogFooter>
            </DialogPopup>
        </Dialog>
    )
}

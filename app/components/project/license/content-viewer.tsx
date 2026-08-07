import { useState } from "react"
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
import { useContentText } from "@/components/project/license/use-content-text"

/**
 * The licence body, read-only, in a modal — the viewer for licences already
 * attached to a project. The catalog's own viewer stacks as a drawer instead;
 * both share {@link useContentText} and {@link ContentBody}.
 */
export default function ContentViewer({ licenceId, title, trigger }: ContentViewerProps) {
    const [open, setOpen] = useState(false)
    const { text, loading } = useContentText(licenceId, open)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={trigger} />
            <DialogPopup className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <DialogContent>
                    <DialogPanel>
                        <ContentBody loading={loading} text={text} className="max-h-[60vh]" />
                    </DialogPanel>
                </DialogContent>
                <DialogFooter>
                    <DialogClose render={<Button variant="outline" />}>Close</DialogClose>
                </DialogFooter>
            </DialogPopup>
        </Dialog>
    )
}

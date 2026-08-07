import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogDescription,
    DialogHeader,
    DialogPanel,
    DialogPopup,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import LinkRow from "@/components/project/corpus/link-row"
import type { LinkPickerProps } from "@/components/project/corpus/types"

/** Pick an existing library corpus to reference from this project. */
export default function LinkPicker({ options, disabled }: LinkPickerProps) {
    const [open, setOpen] = useState(false)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" variant="outline" disabled={disabled} />}>
                Add reference
            </DialogTrigger>
            <DialogPopup>
                <DialogHeader>
                    <DialogTitle>Add a corpus reference</DialogTitle>
                    <DialogDescription>
                        References tell the loader which library corpora belong with this dataset — a commentary
                        references the bible version it comments on.
                    </DialogDescription>
                </DialogHeader>
                <DialogPanel>
                    {options.length === 0 ? (
                        <p className="py-4 text-sm text-muted-foreground">
                            Your library has no corpora yet. Add corpora in the Library area, then reference them here.
                        </p>
                    ) : (
                        <ul className="divide-y">
                            {options.map(option => (
                                <LinkRow key={option.id} option={option} />
                            ))}
                        </ul>
                    )}
                </DialogPanel>
            </DialogPopup>
        </Dialog>
    )
}

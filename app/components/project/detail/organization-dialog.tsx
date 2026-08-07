import { Building2, Check, Plus, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useFetcher } from "react-router"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogPanel,
    DialogPopup,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { OrganizationDialogProps } from "@/components/project/detail/types"
import type { ActionResult } from "@/components/project/types"

/** Empty string, not null: "no organization" is a choice the form has to post. */
const NO_ORGANIZATION = ""

/** Pick an existing organization or create one inline (FR-014, research R5). */
export default function OrganizationDialog({ open, onOpenChange, organizations, currentId }: OrganizationDialogProps) {
    const fetcher = useFetcher<ActionResult>()
    const submittedRef = useRef(false)
    const [mode, setMode] = useState<"pick" | "create">(organizations.length === 0 ? "create" : "pick")
    const busy = fetcher.state !== "idle"
    const organizationItems = [
        { label: "No organization", value: NO_ORGANIZATION },
        ...organizations.map(organization => ({ label: organization.name, value: organization.id })),
    ]

    useEffect(() => {
        if (open) setMode(organizations.length === 0 ? "create" : "pick")
    }, [open, organizations.length])

    useEffect(() => {
        if (submittedRef.current && fetcher.state === "idle" && fetcher.data?.ok) {
            submittedRef.current = false
            onOpenChange(false)
        }
    }, [fetcher.state, fetcher.data, onOpenChange])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPopup>
                <fetcher.Form
                    method="post"
                    onSubmit={() => {
                        submittedRef.current = true
                    }}
                    className="flex min-h-0 flex-col">
                    <DialogHeader>
                        <DialogTitle>Project organization</DialogTitle>
                        <DialogDescription>
                            Associate this project with one organization — pick an existing one or create a new one.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogPanel className="flex flex-col gap-4">
                        <input
                            type="hidden"
                            name="intent"
                            value={mode === "pick" ? "set-organization" : "create-organization"}
                        />
                        {mode === "pick" ? (
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="organization-id" id="organization-label">
                                    Organization
                                </Label>
                                {/*
                                    `items` up front rather than children-only:
                                    the popup is portalled and only mounts on
                                    open, so the trigger would have nothing to
                                    render the current value from until then.
                                */}
                                <Select
                                    items={organizationItems}
                                    name="organizationId"
                                    defaultValue={currentId ?? NO_ORGANIZATION}>
                                    <SelectTrigger
                                        id="organization-id"
                                        aria-labelledby="organization-label organization-id"
                                        className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectPopup>
                                        {organizationItems.map(item => (
                                            <SelectItem key={item.value} value={item.value}>
                                                {item.label}
                                            </SelectItem>
                                        ))}
                                    </SelectPopup>
                                </Select>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="self-start"
                                    onClick={() => setMode("create")}>
                                    <Plus aria-hidden="true" className="size-4" />
                                    Create a new organization…
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="organization-name">Name</Label>
                                    <Input id="organization-name" name="name" aria-required />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="organization-website">Website</Label>
                                    <Input
                                        id="organization-website"
                                        name="website"
                                        type="url"
                                        placeholder="https://…"
                                    />
                                </div>
                                {organizations.length > 0 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="self-start"
                                        onClick={() => setMode("pick")}>
                                        <Building2 aria-hidden="true" className="size-4" />
                                        Pick an existing organization…
                                    </Button>
                                )}
                            </>
                        )}
                        {fetcher.data?.ok === false && fetcher.data.error && (
                            <p role="alert" className="text-sm text-destructive">
                                {fetcher.data.error}
                            </p>
                        )}
                    </DialogPanel>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            <X aria-hidden="true" className="size-4" />
                            Cancel
                        </Button>
                        <Button type="submit" disabled={busy}>
                            {mode === "pick" ? (
                                <Check aria-hidden="true" className="size-4" />
                            ) : (
                                <Plus aria-hidden="true" className="size-4" />
                            )}
                            {mode === "pick" ? "Save" : "Create & assign"}
                        </Button>
                    </DialogFooter>
                </fetcher.Form>
            </DialogPopup>
        </Dialog>
    )
}

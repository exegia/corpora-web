import { Plus } from "lucide-react"
import { useState } from "react"
import { useFetcher } from "react-router"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogPanel,
    DialogPopup,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { LicenseStatus } from "@/lib/projects"

const STATUS_OPTIONS: LicenseStatus[] = ["active", "retired", "superseded"]

/**
 * Superadmin-only creation of a catalog licence. A successful create
 * redirects to the new licence's detail page (the route action).
 */
export default function CreateDialog() {
    const fetcher = useFetcher<{ ok: boolean; error?: string }>()
    const [open, setOpen] = useState(false)
    const [status, setStatus] = useState<LicenseStatus>("active")
    const [domains, setDomains] = useState({
        content: true,
        data: false,
        software: false,
    })
    const busy = fetcher.state !== "idle"

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" />}>
                <Plus /> Create license
            </DialogTrigger>
            <DialogPopup>
                <fetcher.Form
                    method="post"
                    className="flex min-h-0 flex-col"
                    onSubmit={event => {
                        const form = new FormData(event.currentTarget)
                        event.preventDefault()
                        fetcher.submit(
                            {
                                intent: "create-licence",
                                id: String(form.get("id") ?? ""),
                                title: String(form.get("title") ?? ""),
                                url: String(form.get("url") ?? ""),
                                family: String(form.get("family") ?? ""),
                                maintainer: String(form.get("maintainer") ?? ""),
                                status,
                                domainContent: String(domains.content),
                                domainData: String(domains.data),
                                domainSoftware: String(domains.software),
                            },
                            { method: "post" }
                        )
                    }}>
                    <DialogHeader>
                        <DialogTitle>Create a license</DialogTitle>
                        <DialogDescription>
                            Add a licence to the catalog. The identifier is permanent — use the SPDX id when one exists
                            (its text downloads automatically).
                        </DialogDescription>
                    </DialogHeader>
                    <DialogPanel className="flex flex-col gap-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="new-licence-id">Identifier</Label>
                                <Input id="new-licence-id" name="id" placeholder="CC-BY-4.0" aria-required />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="new-licence-status">Status</Label>
                                <Select value={status} onValueChange={value => setStatus(value as LicenseStatus)}>
                                    <SelectTrigger className="w-full" id="new-licence-status">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectPopup>
                                        {STATUS_OPTIONS.map(option => (
                                            <SelectItem key={option} value={option}>
                                                {option}
                                            </SelectItem>
                                        ))}
                                    </SelectPopup>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-2 sm:col-span-2">
                                <Label htmlFor="new-licence-title">Title</Label>
                                <Input id="new-licence-title" name="title" aria-required />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="new-licence-family">Family</Label>
                                <Input id="new-licence-family" name="family" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="new-licence-maintainer">Maintainer</Label>
                                <Input id="new-licence-maintainer" name="maintainer" />
                            </div>
                            <div className="flex flex-col gap-2 sm:col-span-2">
                                <Label htmlFor="new-licence-url">URL</Label>
                                <Input id="new-licence-url" name="url" type="url" placeholder="https://…" />
                            </div>
                            <fieldset className="flex flex-col gap-2 sm:col-span-2">
                                <legend className="text-sm font-medium">Domains</legend>
                                <div className="mt-1 flex flex-wrap gap-x-6 gap-y-2">
                                    {(
                                        [
                                            ["content", "Content"],
                                            ["data", "Data"],
                                            ["software", "Software"],
                                        ] as const
                                    ).map(([key, label]) => (
                                        <Label key={key} className="flex items-center gap-2 font-normal">
                                            <Checkbox
                                                checked={domains[key]}
                                                onCheckedChange={checked =>
                                                    setDomains(current => ({
                                                        ...current,
                                                        [key]: checked === true,
                                                    }))
                                                }
                                            />
                                            {label}
                                        </Label>
                                    ))}
                                </div>
                            </fieldset>
                        </div>
                        {fetcher.data?.ok === false && fetcher.data.error && (
                            <p role="alert" className="text-sm text-destructive">
                                {fetcher.data.error}
                            </p>
                        )}
                    </DialogPanel>
                    <DialogFooter>
                        <Button type="button" variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={busy}>
                            {busy && <Spinner />}
                            {busy ? "Creating…" : "Create license"}
                        </Button>
                    </DialogFooter>
                </fetcher.Form>
            </DialogPopup>
        </Dialog>
    )
}

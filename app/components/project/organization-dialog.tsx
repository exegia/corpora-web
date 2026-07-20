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
import type { Organization } from "@/lib/organizations"

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"

export interface OrganizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizations: Organization[]
  currentId: string | null
}

/** Pick an existing organization or create one inline (FR-014, research R5). */
export function OrganizationDialog({
  open,
  onOpenChange,
  organizations,
  currentId,
}: OrganizationDialogProps) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>()
  const submittedRef = useRef(false)
  const [mode, setMode] = useState<"pick" | "create">(
    organizations.length === 0 ? "create" : "pick",
  )
  const busy = fetcher.state !== "idle"

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
          className="flex min-h-0 flex-col"
        >
          <DialogHeader>
            <DialogTitle>Project organization</DialogTitle>
            <DialogDescription>
              Associate this project with one organization — pick an existing
              one or create a new one.
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
                <Label htmlFor="organization-id">Organization</Label>
                <select
                  id="organization-id"
                  name="organizationId"
                  defaultValue={currentId ?? ""}
                  className={SELECT_CLASS}
                >
                  <option value="">No organization</option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  onClick={() => setMode("create")}
                >
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
                    onClick={() => setMode("pick")}
                  >
                    Pick an existing organization…
                  </Button>
                )}
              </>
            )}
            {fetcher.data?.ok === false && fetcher.data.error && (
              <p role="alert" className="text-destructive text-sm">
                {fetcher.data.error}
              </p>
            )}
          </DialogPanel>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {mode === "pick" ? "Save" : "Create & assign"}
            </Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogPopup>
    </Dialog>
  )
}

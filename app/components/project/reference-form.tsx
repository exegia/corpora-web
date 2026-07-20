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
import type { ProjectReference } from "@/lib/projects"

interface ActionResult {
  ok: boolean
  error?: string
}

export interface ReferenceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, the dialog edits this reference; otherwise it creates one. */
  reference?: ProjectReference
}

export function ReferenceFormDialog({
  open,
  onOpenChange,
  reference,
}: ReferenceFormDialogProps) {
  const fetcher = useFetcher<ActionResult>()
  const [dirty, setDirty] = useState(false)
  const submittedRef = useRef(false)
  const editing = reference !== undefined
  const busy = fetcher.state !== "idle"

  useEffect(() => {
    if (submittedRef.current && fetcher.state === "idle" && fetcher.data?.ok) {
      submittedRef.current = false
      setDirty(false)
      onOpenChange(false)
    }
  }, [fetcher.state, fetcher.data, onOpenChange])

  // Spec edge case: never silently discard mid-edit work.
  const handleOpenChange = (next: boolean) => {
    if (!next && dirty && !busy) {
      if (!window.confirm("Discard unsaved changes?")) return
    }
    if (!next) setDirty(false)
    onOpenChange(next)
  }

  const markDirty = () => setDirty(true)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPopup>
        <fetcher.Form
          method="post"
          onSubmit={() => {
            submittedRef.current = true
          }}
          className="flex min-h-0 flex-col"
        >
          <DialogHeader>
            <DialogTitle>{editing ? "Edit reference" : "Add reference"}</DialogTitle>
            <DialogDescription>
              Bibliographic details for this project. Only the title is required.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel className="flex flex-col gap-4">
            <input
              type="hidden"
              name="intent"
              value={editing ? "update-reference" : "create-reference"}
            />
            {editing && (
              <input type="hidden" name="referenceId" value={reference.id} />
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="reference-title">Title</Label>
              <Input
                id="reference-title"
                name="title"
                defaultValue={reference?.title ?? ""}
                aria-required
                onChange={markDirty}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="reference-authors">Authors</Label>
              <Input
                id="reference-authors"
                name="authors"
                placeholder="Last, F.; Last, F."
                defaultValue={reference?.authors ?? ""}
                onChange={markDirty}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="reference-year">Year</Label>
                <Input
                  id="reference-year"
                  name="year"
                  inputMode="numeric"
                  defaultValue={reference?.year ?? ""}
                  onChange={markDirty}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="reference-publication">Publication</Label>
                <Input
                  id="reference-publication"
                  name="publication"
                  defaultValue={reference?.publication ?? ""}
                  onChange={markDirty}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="reference-url">Source link</Label>
              <Input
                id="reference-url"
                name="url"
                type="url"
                placeholder="https://…"
                defaultValue={reference?.url ?? ""}
                onChange={markDirty}
              />
            </div>
            {fetcher.data?.ok === false && fetcher.data.error && (
              <p role="alert" className="text-destructive text-sm">
                {fetcher.data.error}
              </p>
            )}
          </DialogPanel>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {editing ? "Save changes" : "Add reference"}
            </Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogPopup>
    </Dialog>
  )
}

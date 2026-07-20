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
import { Textarea } from "@/components/ui/textarea"

interface ActionResult {
  ok: boolean
  intent?: string
  error?: string
}

export interface ProjectFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, the dialog edits this project; otherwise it creates one. */
  project?: { id: string; name: string; description: string | null }
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
}: ProjectFormDialogProps) {
  const fetcher = useFetcher<ActionResult>()
  const [dirty, setDirty] = useState(false)
  const submittedRef = useRef(false)
  const editing = project !== undefined
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
            <DialogTitle>{editing ? "Edit project" : "New project"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the project's name or description."
                : "Name your project to get started."}
            </DialogDescription>
          </DialogHeader>
          <DialogPanel className="flex flex-col gap-4">
            <input
              type="hidden"
              name="intent"
              value={editing ? "update-project" : "create-project"}
            />
            {editing && <input type="hidden" name="projectId" value={project.id} />}
            <div className="flex flex-col gap-2">
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                name="name"
                defaultValue={project?.name ?? ""}
                aria-required
                onChange={() => setDirty(true)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                name="description"
                defaultValue={project?.description ?? ""}
                rows={3}
                onChange={() => setDirty(true)}
              />
            </div>
            {fetcher.data?.ok === false && fetcher.data.error && (
              <p role="alert" className="text-sm text-destructive">
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
              {editing ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogPopup>
    </Dialog>
  )
}

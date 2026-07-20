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
import type { DirectoryUser } from "@/lib/users"

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
  /**
   * Seeded user directory for the required creator select (create mode only;
   * the creator is immutable after creation — FR-015). Honor-system selection
   * until corpora-auth ships.
   */
  users?: DirectoryUser[]
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  users = [],
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
            {!editing && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="project-creator">Creator</Label>
                {users.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No user profiles are available yet, so a project cannot be
                    created. The user directory must be seeded first.
                  </p>
                ) : (
                  <select
                    id="project-creator"
                    name="userId"
                    required
                    defaultValue=""
                    onChange={() => setDirty(true)}
                    className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value="" disabled>
                      Pick your user profile…
                    </option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name ?? user.username}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
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
            <Button type="submit" disabled={busy || (!editing && users.length === 0)}>
              {editing ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogPopup>
    </Dialog>
  )
}

import { useFetcher } from "react-router"
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

export interface DeleteProjectDialogProps {
  project: { id: string; name: string }
  /** Rendered as the trigger; defaults to a destructive "Delete" button. */
  trigger?: React.ReactElement
}

export function DeleteProjectDialog({ project, trigger }: DeleteProjectDialogProps) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>()
  const busy = fetcher.state !== "idle"

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={trigger ?? <Button variant="destructive-outline" size="sm" />}
      >
        Delete
      </AlertDialogTrigger>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{project.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This deletes the project and its references. Linked corpora are only
            unlinked — they stay in your library. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {fetcher.data?.ok === false && fetcher.data.error && (
          <p role="alert" className="px-6 text-sm text-destructive">
            {fetcher.data.error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="outline" />}>
            Cancel
          </AlertDialogClose>
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="delete-project" />
            <input type="hidden" name="projectId" value={project.id} />
            <Button type="submit" variant="destructive" disabled={busy}>
              Delete project
            </Button>
          </fetcher.Form>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  )
}

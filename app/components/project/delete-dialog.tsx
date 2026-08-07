import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"

export interface DeleteProjectDialogProps {
    project: { id: string; name: string }
    /** Rendered as the trigger; defaults to a destructive "Delete" button. */
    trigger?: React.ReactElement
}

export function DeleteDialog({ project, trigger }: DeleteProjectDialogProps) {
    return (
        <ConfirmDeleteDialog
            confirmLabel="Delete project"
            description="This deletes the project and its references. Linked corpora are only unlinked — they stay in your library. This cannot be undone."
            fields={{ projectId: project.id }}
            intent="delete-project"
            title={`Delete “${project.name}”?`}
            trigger={trigger}
        />
    )
}

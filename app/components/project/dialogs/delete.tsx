import { Blocks } from "@/components/blocks"
import type { DeleteDialogProps } from "@/components/project/dialogs/types"

/** Destructive confirm for a project — references go, linked corpora stay. */
export default function DeleteDialog({ project, trigger }: DeleteDialogProps) {
    return (
        <Blocks.ConfirmDelete
            confirmLabel="Delete project"
            description="This deletes the project and its references. Linked corpora are only unlinked — they stay in your library. This cannot be undone."
            fields={{ projectId: project.id }}
            intent="delete-project"
            title={`Delete “${project.name}”?`}
            trigger={trigger}
        />
    )
}

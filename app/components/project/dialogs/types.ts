import type { DirectoryUser } from "@/lib/users"

export interface FormDialogProps {
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

export interface DeleteDialogProps {
    project: { id: string; name: string }
    /** Rendered as the trigger; defaults to a destructive "Delete" button. */
    trigger?: React.ReactElement
}

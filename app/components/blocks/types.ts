import type React from "react"
import type { ButtonProps } from "@exegia/corpora-ui"
import type { ProjectStatus } from "@/lib/projects"

// glassVariant is omitted along with variant: ButtonProps is a discriminated
// union where only `variant: "glass"` accepts it, and this narrower variant
// set never does.
export type MetadataAction = Omit<ButtonProps, "children" | "variant" | "glassVariant"> & {
    label?: string
    icon?: React.ReactNode
    variant?: "default" | "ghost" | "outline"
}

/** A trigger carried by the value itself, in place of a trailing action button. */
export type MetadataValueAction = Omit<ButtonProps, "children" | "variant" | "glassVariant" | "size">

export type MetadataProps = {
    label: string
    value?: string | React.ReactNode | null
    actions?: Array<MetadataAction> | MetadataAction
    /**
     * Makes a present value the row's own trigger. Opt-in per row: a value that
     * already contains a link or a button of its own cannot become one without
     * nesting interactive content, so those rows pass their own markup instead.
     */
    valueAction?: MetadataValueAction
    /**
     * Trigger behind the “+ Add {label}” link that stands in for the empty
     * state. Kept separate from `valueAction` because a row can be addable
     * while its filled state is not clickable — Organization is exactly that.
     */
    addAction?: MetadataValueAction
    direction?: "row" | "column"
    /** Default variant for actions that don't set their own. */
    variant?: "default" | "ghost" | "outline"
    className?: string
}

export type AlertVariant = "error" | "info" | "success" | "warning"

export interface AlertBlockProps {
    variant: AlertVariant
    title: React.ReactNode
    description?: React.ReactNode
    actions?: React.ReactNode[] | React.ReactNode
    className?: string
}

export interface StatusBlockProps {
    status: ProjectStatus
    className?: string
}

export interface ConfirmDeleteDialogProps {
    title: React.ReactNode
    description: React.ReactNode
    /** Label for the confirming submit button, e.g. "Delete project". */
    confirmLabel: string
    /** Action intent, plus whatever ids that intent needs. */
    intent: string
    fields?: Record<string, string>
    /** Rendered as the trigger; defaults to a destructive "Delete" button. */
    trigger?: React.ReactElement
    /** Trigger text. Overridden entirely when `trigger` has its own children. */
    triggerLabel?: string
    /**
     * The phrase to type. Defaults to `DELETE` — scale it with the blast
     * radius: a project is one word, an account is a sentence you cannot type
     * by reflex.
     */
    confirmWord?: string
}

export interface TermsDialogProps {
    /** Element the dialog renders as its trigger — `render` needs an element,
        not arbitrary ReactNode. */
    trigger: React.ReactElement
    /** Called when the reader accepts. Omit to offer only a close button. */
    onAgree?: () => void
}

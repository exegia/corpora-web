import React from "react"
import { cn } from "@/lib/utils"
import { Button, type ButtonProps } from "@exegia/corpora-ui"

// glassVariant is omitted along with variant: ButtonProps is a discriminated
// union where only `variant: "glass"` accepts it, and this narrower variant
// set never does.
export type MetadataAction = Omit<ButtonProps, "children" | "variant" | "glassVariant"> & {
    label?: string
    icon?: React.ReactNode
    variant?: "default" | "ghost" | "outline"
}

export type MetadataProps = {
    label: string
    value?: string | React.ReactNode | null
    actions?: Array<MetadataAction> | MetadataAction
    direction?: "row" | "column"
    /** Default variant for actions that don't set their own. */
    variant?: "default" | "ghost" | "outline"
    className?: string
}

const ActionButton = ({ label, icon, variant = "ghost", size = "sm", ...props }: MetadataAction) => {
    return (
        <Button {...props} size={size} variant={variant}>
            {icon}
            {label}
        </Button>
    )
}

/**
 * `false` and `null` are how a conditional value ("only render the link when
 * there is a website") arrives here — both mean "nothing to show", and neither
 * may reach `String()`, which is where the literal "null" came from.
 */
function isEmpty(value: MetadataProps["value"]): boolean {
    return value === null || value === undefined || value === false || value === ""
}

const MetadataBlock = ({ label, value, actions, direction = "row", variant = "ghost", className }: MetadataProps) => {
    const list = actions ? (Array.isArray(actions) ? actions : [actions]) : []
    const content = isEmpty(value) ? (
        <span className="text-muted-foreground italic">No {label}</span>
    ) : React.isValidElement(value) ? (
        value
    ) : (
        String(value)
    )

    return (
        <div
            className={cn(
                // -mx-2/px-2 lets the hover tint bleed past the text without moving it.
                // min-h-11 keeps a row with a button the same height as one without.
                "group/meta -mx-2 flex min-h-11 gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/40",
                direction === "row" ? "items-center" : "items-start",
                className
            )}>
            <dl
                className={cn(
                    "flex min-w-0 flex-1 gap-x-3 gap-y-0.5 text-sm",
                    direction === "row" ? "flex-row items-center justify-between" : "flex-col"
                )}>
                <dt className={cn("text-muted-foreground", direction === "row" && "w-28 shrink-0")}>{label}</dt>
                <dd
                    className={cn(
                        "flex min-w-0 items-center gap-2 text-foreground",
                        direction === "row" ? "flex-1 justify-end text-right" : "w-full"
                    )}>
                    {content}
                </dd>
            </dl>
            {/*
        The slot is reserved even with no actions: stacked rows are read as a
        column, and an actionless row would otherwise run its value 76px further
        right than its neighbours.
      */}
            <div className="flex min-w-16 shrink-0 items-center justify-end gap-1">
                {list.map((action, index) => (
                    <ActionButton key={action.label ?? index} variant={variant} {...action} />
                ))}
            </div>
        </div>
    )
}

export default MetadataBlock

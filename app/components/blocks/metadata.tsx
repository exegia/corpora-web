import { Plus } from "lucide-react"
import React from "react"
import { Button } from "@exegia/corpora-ui"
import { cn } from "@/lib/utils"
import ActionButton from "@/components/blocks/action-button"
import type { MetadataProps } from "@/components/blocks/types"

/**
 * `false` and `null` are how a conditional value ("only render the link when
 * there is a website") arrives here — both mean "nothing to show", and neither
 * may reach `String()`, which is where the literal "null" came from.
 */
function isEmpty(value: MetadataProps["value"]): boolean {
    return value === null || value === undefined || value === false || value === ""
}

const MetadataBlock = ({
    label,
    value,
    actions,
    valueAction,
    addAction,
    direction = "row",
    variant = "ghost",
    className,
}: MetadataProps) => {
    const list = actions ? (Array.isArray(actions) ? actions : [actions]) : []
    const rendered = React.isValidElement(value) ? value : String(value)

    let content: React.ReactNode
    if (isEmpty(value)) {
        content = addAction ? (
            // The empty state is the affordance: nothing else on the row says
            // the field can be filled in now that the Edit buttons are gone.
            <Button {...addAction} size="sm" variant="link" className="h-auto p-0">
                <Plus aria-hidden="true" />
                Add {label.toLowerCase()}
            </Button>
        ) : (
            <span className="text-muted-foreground italic">No {label}</span>
        )
    } else if (valueAction) {
        // No justify-between here — Button emits a hidden leading span, so it
        // would distribute across three children and centre the label.
        // See docs/ui-patterns.md.
        content = (
            <Button {...valueAction} size="sm" variant="link" className="h-auto min-w-0 p-0 text-foreground">
                <span className="truncate">{rendered}</span>
            </Button>
        )
    } else {
        content = rendered
    }

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
                Only reserved when something occupies it. It used to render
                empty so a mixed panel stayed aligned; now that a row's trigger
                lives on its value, an always-on 64px gutter is dead space on
                every row.
            */}
            {list.length > 0 && (
                <div className="flex min-w-16 shrink-0 items-center justify-end gap-1">
                    {list.map((action, index) => (
                        <ActionButton key={action.label ?? index} variant={variant} {...action} />
                    ))}
                </div>
            )}
        </div>
    )
}

export default MetadataBlock

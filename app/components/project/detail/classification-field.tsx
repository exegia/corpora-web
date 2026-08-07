import { Blocks } from "@/components/blocks"
import { Pencil } from "lucide-react"
import type { ClassificationFieldProps } from "@/components/project/detail/types"
import { cn } from "@/lib/utils"

/** The type / languages / category summary, with its edit affordance. */
export default function ClassificationField({ project, readOnly, onEdit }: ClassificationFieldProps) {
    const classification = [
        project.type,
        project.languages.length > 0 ? project.languages.join(", ") : project.category,
    ]
        .filter(Boolean)
        .join(" · ")

    return (
        <Blocks.Metadata
            label="Classification"
            value={
                <span className={cn("capitalize", classification ? "" : "text-muted-foreground italic")}>
                    {classification ? classification : "Unclassified"}
                </span>
            }
            actions={
                readOnly
                    ? undefined
                    : {
                          icon: <Pencil aria-hidden="true" />,
                          onClick: onEdit,
                          label: "Edit",
                          // Three rows say "Edit"; the field has to be in the
                          // accessible name, or they are indistinguishable.
                          "aria-label": "Edit classification",
                      }
            }
        />
    )
}

import { Blocks } from "@/components/blocks"
import type { ClassificationFieldProps } from "@/components/project/detail/types"
import { TYPE_ICONS } from "@/lib/corpus";

/** The type / languages / category summary, with its edit affordance. */
export default function ClassificationField({ project, readOnly, onEdit }: ClassificationFieldProps) {
    const classification = [
        project.type,
        project.languages.length > 0 ? project.languages.join(", ") : project.category,
    ]
        .filter(Boolean)
        .join(" · ")

     const Icon = project.type && project.type in TYPE_ICONS ? TYPE_ICONS[project.type] : null
    
    return (
        <Blocks.Metadata
            label="Classification"
            value={classification ? <div className="flex items-center gap-2">{Icon && <Icon />}<span className="capitalize">{classification}</span></div> : null}
            // The value is the trigger now, so the field has to be in its
            // accessible name — three rows would otherwise all announce as
            // bare values.
            valueAction={readOnly ? undefined : { onClick: onEdit, "aria-label": "Edit classification" }}
            addAction={readOnly ? undefined : { onClick: onEdit, "aria-label": "Add classification" }}
        />
    )
}

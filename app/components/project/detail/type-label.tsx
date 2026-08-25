
import type { TypeLabelProps } from "@/components/project/detail/types"
import { TYPE_ICONS } from "@/lib/corpus/corpus"

/** A book type with its icon, or the unclassified placeholder. */
export default function TypeLabel({ type }: TypeLabelProps) {
    if (!type) return <span className="text-muted-foreground">Unclassified</span>
    const Icon = TYPE_ICONS[type]

    return (
        <span className="flex items-center gap-2">
            <Icon aria-hidden="true" className="size-4 opacity-80" />
            <span className="truncate capitalize">{type}</span>
        </span>
    )
}

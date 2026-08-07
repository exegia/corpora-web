import type { IconLabelProps } from "@/components/project/detail/types"

/** An icon paired with a capitalized label, for select triggers and items. */
export default function IconLabel({ icon: Icon, text }: IconLabelProps) {
    return (
        <span className="flex items-center gap-2">
            <Icon aria-hidden="true" className="size-4 opacity-80" />
            <span className="truncate capitalize">{text}</span>
        </span>
    )
}

import type { LucideIcon } from "lucide-react"
import {
    Book,
    BookA,
    BookOpenText,
    Feather,
    MessageSquareText,
    MoonStar,
    NotebookPen,
    Scroll,
    ScrollText,
    UserRound,
} from "lucide-react"
import type { TypeLabelProps } from "@/components/project/detail/types"
import type { BookType } from "@/lib/projects"

const TYPE_ICONS: Record<BookType, LucideIcon> = {
    bible: BookOpenText,
    tanakh: ScrollText,
    quran: MoonStar,
    apocrypha: Scroll,
    commentary: MessageSquareText,
    lexicon: BookA,
    biography: UserRound,
    review: NotebookPen,
    manuscript: Feather,
    regular: Book,
}

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

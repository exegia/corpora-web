import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PreviewCard, PreviewCardPopup, PreviewCardTrigger } from "@/components/ui/preview-card"
import type { CreatorPreviewProps } from "@/components/project/detail/types"
import { initials } from "@/lib/utils"

/**
 * The project's creator, previewed on hover or focus.
 *
 * Only what `ProjectCreator` carries — name, username — is shown. The detail
 * route already fans out five queries; an email or avatar lookup would be a
 * sixth for a hover card.
 */
export default function CreatorPreview({ creator }: CreatorPreviewProps) {
    const display = creator.name ?? creator.username

    return (
        <PreviewCard>
            <PreviewCardTrigger
                render={
                    // A button, not a link: there is nowhere to navigate to
                    // yet, and the preview has to be reachable by keyboard.
                    <button
                        type="button"
                        aria-label={`About ${display}`}
                        className="max-w-full cursor-default truncate rounded-sm italic opacity-60 decoration-dotted underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                    />
                }>
                {display}
            </PreviewCardTrigger>
            <PreviewCardPopup align="start" className="w-auto min-w-56 items-center gap-3 text-left">
                <Avatar className="size-9">
                    <AvatarFallback className="text-xs">{initials(creator)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                    <p className="truncate font-medium">{display}</p>
                    <p className="truncate text-xs text-muted-foreground">@{creator.username}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Created this project</p>
                </div>
            </PreviewCardPopup>
        </PreviewCard>
    )
}

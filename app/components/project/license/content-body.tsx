import { useRemarkSync } from "react-remark"
import { Spinner } from "@/components/ui/spinner"
import type { ContentBodyProps } from "@/components/project/license/types"
import { cn } from "@/lib/utils"

/**
 * Split out so the Markdown hook runs only against a settled string.
 *
 * Scrolling belongs to the surrounding panel — both `DialogPanel` and
 * `DrawerPanel` wrap their children in a `ScrollArea`.
 */
export default function ContentBody({ loading, text, className }: ContentBodyProps) {
    // Synchronous render — the stored text carries no async remark plugins.
    const rendered = useRemarkSync(text ?? "")

    if (loading) {
        return (
            <p
                role="status"
                aria-label="Loading the licence text"
                className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Spinner />
                Loading the licence text…
            </p>
        )
    }
    if (!text) {
        return (
            <p className="py-6 text-sm text-muted-foreground">
                The full text of this licence could not be retrieved. Open the licence in the catalog to add it.
            </p>
        )
    }
    return (
        <div
            className={cn(
                // Licence texts are hard-wrapped at ~80 columns, so any line
                // indented in the source becomes a <pre> that would otherwise
                // scroll the panel sideways in a narrow drawer.
                "text-sm break-words whitespace-pre-wrap [&_a]:underline [&_a]:underline-offset-2 [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:font-semibold [&_p]:mt-2 [&_pre]:break-words [&_pre]:whitespace-pre-wrap",
                className
            )}>
            {rendered}
        </div>
    )
}

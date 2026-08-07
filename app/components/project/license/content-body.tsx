import { useRemarkSync } from "react-remark"
import { Spinner } from "@/components/ui/spinner"
import type { ContentBodyProps } from "@/components/project/license/types"

/** Split out so the Markdown hook runs only against a settled string. */
export default function ContentBody({ loading, text }: ContentBodyProps) {
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
        <div className="max-h-[60vh] overflow-y-auto text-sm whitespace-pre-wrap [&_a]:underline [&_a]:underline-offset-2 [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:font-semibold [&_p]:mt-2">
            {rendered}
        </div>
    )
}

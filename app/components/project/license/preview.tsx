import { marked } from "marked"
import { useMemo } from "react"
import type { PreviewProps } from "@/components/project/license/types"
import { licenceMarkdown } from "@/components/project/license/utils"

/** The hover-card summary of a catalog licence. */
export default function Preview({ licence }: PreviewProps) {
    const html = useMemo(() => marked.parse(licenceMarkdown(licence), { async: false }), [licence])

    return (
        <div
            className="[&_a]:underline [&_a]:underline-offset-2 [&_h3]:text-base [&_h3]:font-semibold [&_p]:mt-2 first:[&_p]:mt-0"
            // Our own generated Markdown — no user-provided HTML flows through here.
            dangerouslySetInnerHTML={{ __html: html }}
        />
    )
}

import { useConversion } from "./use-conversion"
import Panel from "./panel"

/** The shell keeps this element; read live conversion atoms on every render. */
export default function PanelHost() {
    const conversion = useConversion()
    if (!conversion.entry) return null
    return (
        <Panel
            documentId={conversion.documentId}
            entry={conversion.entry}
            onDismiss={conversion.dismiss}
            onRetry={conversion.retry}
        />
    )
}

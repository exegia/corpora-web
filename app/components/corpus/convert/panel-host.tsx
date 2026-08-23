import { useConversionContext } from "./conversion-context"
import Panel from "./panel"

/**
 * The element AppLayout hands to `openPanel("right", …)`. `openPanel` stores
 * the ReactNode it is given, so a `<Panel entry={…} />` built at open time
 * would freeze that render's entry; this host reads the live controller from
 * context instead, so the panel tracks the run for as long as it stays open.
 */
export default function PanelHost() {
    const conversion = useConversionContext()
    if (!conversion.entry) return null
    return (
        <Panel
            documentId={conversion.documentId}
            entry={conversion.entry}
            onClose={conversion.closePanel}
            onDismiss={conversion.dismiss}
            onRetry={conversion.retry}
        />
    )
}

import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress"
import Corpus from "@/lib/corpus"
import { CONVERSION_STEPS } from "@/lib/corpus"
import FileSummary from "./file-summary"
import LogSteps from "./log-steps"
import type { PanelProps } from "./types"
import { conversionTone, isDone } from "./utils"

/**
 * The conversion panel: content for the app shell's right panel
 * (Layout.Main `panels.right`), so the library stays visible and
 * interactive while the pipeline runs. Closed via the shell toggle,
 * Dismiss on the alert, or View corpus — no in-panel close button.
 */
export default function Panel({ entry, documentId, onDismiss, onRetry }: PanelProps) {
    const done = isDone(entry)
    const failed = entry.status === "error"
    const { index } = Corpus.Convert.currentStep(entry)
    const progress = Corpus.Convert.deriveProgress(entry)
    const tone = conversionTone(failed ? "failed" : done ? "completed" : "active")
    const stepLabel = done
        ? `${CONVERSION_STEPS.length} of ${CONVERSION_STEPS.length} steps`
        : `Step ${index} of ${CONVERSION_STEPS.length}`

    return (
        <div className="flex h-full min-h-0 flex-col overflow-y-auto">
            <header className="sticky top-0 z-10 flex flex-col gap-2 bg-background px-4 pt-4 pb-6">
                <h2 className="font-heading text-lg leading-none font-semibold">
                    {done ? "Conversion complete" : failed ? "Conversion failed" : "Converting"}
                </h2>
                <p className="text-sm text-muted-foreground">
                    {entry.name} · {stepLabel}
                </p>
                <Progress
                    aria-label="Conversion progress"
                    max={failed ? CONVERSION_STEPS.length : 100}
                    value={failed ? index : done ? 100 : progress * 100}>
                    <ProgressTrack className={tone.track}>
                        <ProgressIndicator className={tone.fill} />
                    </ProgressTrack>
                </Progress>
            </header>

            <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 pt-0">
                <LogSteps entry={entry} />
                <FileSummary documentId={documentId} entry={entry} onDismiss={onDismiss} onRetry={onRetry} />
            </div>
        </div>
    )
}

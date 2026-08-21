import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress"
import { CONVERSION_STEPS, currentStep, deriveProgress, deriveSteps } from "@/lib/corpus-convert"
import FileSummary from "./file-summary"
import LogSteps from "./log-steps"
import type { PanelProps } from "./types"
import { estimateRemaining, formatElapsed, isDone } from "./utils"

/**
 * The conversion panel: content for the app shell's right panel
 * (Layout.Main `panels.right`), so the library stays visible and
 * interactive while the pipeline runs.
 */
export default function Panel({ entry, documentId, onClose, onRetry, onDismiss }: PanelProps) {
    const done = isDone(entry)
    const failed = entry.status === "error"
    const { index } = currentStep(entry)
    const completed = deriveSteps(entry).filter(step => step.state === "completed").length
    const progress = deriveProgress(entry)

    return (
        <div className="flex h-full min-h-0 flex-col overflow-y-auto">
            <header className="sticky top-0 left-0 flex w-full flex-1 flex-row">
                <div className="flex w-full flex-1 flex-row">
                    <h2 className="font-heading text-lg leading-none font-semibold">
                        {done ? "Conversion complete" : failed ? "Conversion failed" : "Converting"}
                    </h2>
                    <Button
                        aria-label="Close conversion panel"
                        className="-me-1.5 -mt-1.5"
                        onClick={onClose}
                        size="icon-sm"
                        type="button"
                        variant="ghost">
                        <X />
                    </Button>
                </div>
                <div className="flex flex-col gap-2 p-4">
                    <p className="text-sm text-muted-foreground">
                        {entry.name} ·{" "}
                        {done
                            ? `${CONVERSION_STEPS.length} of ${CONVERSION_STEPS.length} steps`
                            : `Step ${index} of ${CONVERSION_STEPS.length}`}
                    </p>
                    <Progress
                        aria-label="Conversion progress"
                        value={failed ? index : done ? 100 : progress * 100}
                        max={failed ? CONVERSION_STEPS.length : 100}>
                        <ProgressTrack className={failed ? "bg-destructive/16" : undefined}>
                            <ProgressIndicator className={failed ? "bg-destructive" : "bg-warning-foreground"} />
                        </ProgressTrack>
                    </Progress>
                </div>
            </header>

            <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 pt-0">
                <LogSteps entry={entry} />
               
                <FileSummary documentId={documentId} entry={entry} onDismiss={onDismiss} onRetry={onRetry} />
            </div>
        </div>
    )
}

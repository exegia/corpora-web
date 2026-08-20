import {
  Progress,
  ProgressIndicator,
  ProgressTrack,
} from "@/components/ui/progress"
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  CONVERSION_STEPS,
  currentStep,
  deriveProgress,
  deriveSteps,
} from "@/lib/corpus-convert"
import FileSummary from "./file-summary"
import LogSteps from "./log-steps"
import type { DrawerProps } from "./types"
import { estimateRemaining, formatElapsed, isDone } from "./utils"

/**
 * The conversion drawer: an inset right sheet without a backdrop, so the
 * library stays visible (and interactive) while the pipeline runs.
 */
export default function Drawer({
  entry,
  open,
  onOpenChange,
  documentId,
  onRetry,
  onDismiss,
}: DrawerProps) {
  const done = isDone(entry)
  const failed = entry.status === "error"
  const { index } = currentStep(entry)
  const completed = deriveSteps(entry).filter(
    (step) => step.state === "completed",
  ).length
  const progress = deriveProgress(entry)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPopup side="right" variant="inset" showBackdrop={false}>
        <SheetHeader>
          <SheetTitle>
            {done
              ? "Conversion complete"
              : failed
                ? "Conversion failed"
                : "Converting"}
          </SheetTitle>
          <SheetDescription>
            {entry.name} ·{" "}
            {done
              ? `${CONVERSION_STEPS.length} of ${CONVERSION_STEPS.length} steps`
              : `Step ${index} of ${CONVERSION_STEPS.length}`}
          </SheetDescription>
          <Progress
            aria-label="Conversion progress"
            value={failed ? index : done ? 100 : progress * 100}
            max={failed ? CONVERSION_STEPS.length : 100}
          >
            <ProgressTrack className={failed ? "bg-destructive/16" : undefined}>
              <ProgressIndicator
                className={
                  failed ? "bg-destructive" : "bg-warning-foreground"
                }
              />
            </ProgressTrack>
          </Progress>
        </SheetHeader>
        <SheetPanel className="flex flex-col gap-4">
          <LogSteps entry={entry} />
          <p className="text-muted-foreground text-xs">
            {done
              ? `Completed in ${formatElapsed(entry)}`
              : failed
                ? "Conversion failed. See the failed step above."
                : estimateRemaining(completed)}
          </p>
          <FileSummary
            documentId={documentId}
            entry={entry}
            onDismiss={onDismiss}
            onRetry={onRetry}
          />
        </SheetPanel>
      </SheetPopup>
    </Sheet>
  )
}

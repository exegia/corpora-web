import { Link } from "react-router"
import { Blocks } from "@/components/blocks"
import { Button } from "@/components/ui/button"@/lib/corpus/corpus-convert
import { CONVERSION_STEPS, currentStep } from "@/lib/corpus-convert"
import type { StatusPillProps } from "./types"
import { isDone } from "./utils"

/**
 * In-page conversion alert (coss p-alert-3). Actions sit in one AlertAction:
 * Dismiss (ghost, only once the run has finished or failed) plus the primary
 * next step. Opening the drawer is the primary action while the run is in
 * flight or failed; View corpus takes over once the document is persisted.
 */
export default function StatusPill({
  entry,
  documentId,
  onOpen,
  onDismiss,
}: StatusPillProps) {
  const { id } = currentStep(entry)
  const stepTitle = CONVERSION_STEPS.find((step) => step.id === id)?.title
  const done = isDone(entry)
  const failed = entry.status === "error"
  const variant = done ? "success" : failed ? "error" : "warning"
  const title = done
    ? "Conversion complete"
    : failed
      ? "Conversion failed"
      : "Converting"

  return (
    <Blocks.Alert
      actions={
        <>
          {(done || failed) && (
            <Button onClick={onDismiss} size="xs" type="button" variant="ghost">
              Dismiss
            </Button>
          )}
          {done && documentId ? (
            <Button
              render={
                <Link
                  onClick={onDismiss}
                  to={`/corpus/${documentId}`}
                  viewTransition
                />
              }
              size="xs"
            >
              View corpus
            </Button>
          ) : (
            <Button onClick={onOpen} size="xs" type="button">
              Show progress
            </Button>
          )}
        </>
      }
      description={stepTitle}
      title={title}
      variant={variant}
    />
  )
}

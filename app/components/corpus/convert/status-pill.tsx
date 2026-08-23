import { Check, ChevronRight } from "lucide-react"
import { Link } from "react-router"
import { CONVERSION_STEPS, currentStep } from "@/lib/corpus-convert"
import type { StatusPillProps } from "./types"
import { isDone } from "./utils"

/**
 * The header pill tracking the in-flight conversion. The whole pill opens
 * the drawer via a stretched button overlay; "View corpus" is a sibling Link
 * lifted above it (never a button-in-link).
 */
export default function StatusPill({
  entry,
  documentId,
  onOpen,
}: StatusPillProps) {
  const { id, index } = currentStep(entry)
  const stepTitle = CONVERSION_STEPS.find((step) => step.id === id)?.title
  const done = isDone(entry)
  const failed = entry.status === "error"

  return (
    <div className="relative flex min-w-0 items-center gap-2 rounded-full border bg-card py-1.5 ps-4 pe-3 text-sm shadow-xs">
      <button
        aria-label="Show conversion progress"
        className="flex min-w-0 items-center gap-2 outline-none after:absolute after:inset-0 after:rounded-full focus-visible:after:inset-ring-2 focus-visible:after:inset-ring-ring"
        onClick={onOpen}
        type="button"
      >
        {done ? (
          <>
            <span className="truncate font-medium">
              {entry.name} converted
            </span>
            <span className="flex shrink-0 items-center gap-1 font-medium text-warning-foreground">
              <Check aria-hidden="true" className="size-3.5" /> Completed
            </span>
          </>
        ) : failed ? (
          <>
            <span className="truncate font-medium">{entry.name}</span>
            <span className="shrink-0 font-medium text-destructive">
              – Conversion failed
            </span>
            <span className="shrink-0 text-muted-foreground">
              Step {index} of {CONVERSION_STEPS.length}
            </span>
          </>
        ) : (
          <>
            <span className="truncate font-medium">
              Converting {entry.name}
            </span>
            <span className="shrink-0 font-medium text-warning-foreground">
              – {stepTitle}…
            </span>
            <span className="shrink-0 text-muted-foreground">
              Step {index} of {CONVERSION_STEPS.length}
            </span>
          </>
        )}
      </button>
      {done && documentId && (
        <Link
          className="relative z-10 shrink-0 font-medium underline-offset-2 hover:underline"
          to={`/corpus/${documentId}`}
          viewTransition
        >
          View corpus
        </Link>
      )}
      <ChevronRight
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground"
      />
    </div>
  )
}

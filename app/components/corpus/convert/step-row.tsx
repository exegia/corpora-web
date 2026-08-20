import { Check, X } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import type { ConversionStep } from "@/lib/corpus-convert"
import { TONE_CLASSES } from "./utils"

const STATE_LABELS = {
  pending: "Pending",
  active: "In progress",
  completed: "Completed",
  failed: "Failed",
} as const

/** One pipeline step in the Logs card: icon, title, status, its log lines. */
export default function StepRow({ step }: { step: ConversionStep }) {
  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2.5">
        {step.state === "completed" ? (
          <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full border border-warning-foreground/48 text-warning-foreground">
            <Check aria-hidden="true" className="size-3" />
          </span>
        ) : step.state === "active" ? (
          // Spinner carries role="status" itself — tests query steps by text.
          <Spinner className="size-4.5 shrink-0 text-warning-foreground" />
        ) : step.state === "failed" ? (
          <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full border border-destructive/48 text-destructive">
            <X aria-hidden="true" className="size-3" />
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="size-4.5 shrink-0 rounded-full border border-border"
          />
        )}
        <span
          className={`font-medium text-sm ${
            step.state === "pending" ? "text-muted-foreground" : ""
          }`}
        >
          {step.title}
        </span>
        <span
          className={`text-xs ${
            step.state === "failed"
              ? "text-destructive"
              : step.state === "pending"
                ? "text-muted-foreground/72"
                : "text-warning-foreground"
          }`}
        >
          {STATE_LABELS[step.state]}
        </span>
      </div>
      {step.logs.length > 0 && (
        <ul className="flex flex-col gap-0.5 ps-7">
          {step.logs.map((log) => (
            <li
              className={`font-mono text-xs ${TONE_CLASSES[log.tone]}`}
              key={log.text}
            >
              {log.text}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

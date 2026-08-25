import { Check, X } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import type { ConversionStep } from "@/lib/corpus/convert"
import { conversionTone, TONE_CLASSES } from "./utils"

const STATE_LABELS = {
  pending: "Pending",
  active: "In progress",
  completed: "Completed",
  failed: "Failed",
} as const

/** One pipeline step in the Logs card: icon, title, status, its log lines. */
export default function StepRow({ step }: { step: ConversionStep }) {
  const tone =
    step.state === "pending"
      ? null
      : conversionTone(step.state === "failed" ? "failed" : step.state === "completed" ? "completed" : "active")
  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2.5">
        {step.state === "completed" ? (
          <span className={`flex size-4.5 shrink-0 items-center justify-center rounded-full border ${tone?.ring} ${tone?.text}`}>
            <Check aria-hidden="true" className="size-3" />
          </span>
        ) : step.state === "active" ? (
          // Spinner carries role="status" itself — tests query steps by text.
          <Spinner className={`size-4.5 shrink-0 ${tone?.text}`} />
        ) : step.state === "failed" ? (
          <span className={`flex size-4.5 shrink-0 items-center justify-center rounded-full border ${tone?.ring} ${tone?.text}`}>
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
            tone?.text ?? "text-muted-foreground/72"
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

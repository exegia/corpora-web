import { ArrowDown, Copy } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { deriveSteps } from "@/lib/corpus-convert"
import StepRow from "./step-row"
import type { LogStepsProps } from "./types"

/**
 * The "Logs" card: the four derived pipeline steps with their log lines,
 * a copy button, and a jump-to-latest pill when the user scrolled up.
 */
export default function LogSteps({ entry }: LogStepsProps) {
  const steps = deriveSteps(entry)
  const scrollRef = useRef<HTMLDivElement>(null)
  // Pinned = following the newest lines; scrolling up unpins.
  const [pinned, setPinned] = useState(true)

  // biome-ignore lint: scrolling on log growth is the effect's whole point
  useEffect(() => {
    const el = scrollRef.current
    // Assign scrollTop instead of scrollTo(): jsdom implements only the former.
    if (pinned && el) el.scrollTop = el.scrollHeight
  }, [entry.logs.length, pinned])

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl border">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <h3 className="font-medium text-sm">Logs</h3>
        <Button
          aria-label="Copy logs"
          onClick={() =>
            void navigator.clipboard.writeText(
              entry.logs.map((log) => log.text).join("\n"),
            )
          }
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <Copy />
        </Button>
      </div>
      <div className="relative min-h-0 flex-1">
        <div
          className="max-h-72 overflow-y-auto p-4"
          onScroll={(event) => {
            const el = event.currentTarget
            setPinned(el.scrollTop + el.clientHeight >= el.scrollHeight - 8)
          }}
          ref={scrollRef}
        >
          <ol className="flex flex-col gap-3">
            {steps.map((step) => (
              <StepRow key={step.id} step={step} />
            ))}
          </ol>
        </div>
        {!pinned && (
          <div className="absolute inset-x-0 bottom-2 flex justify-center">
            <Button
              onClick={() => {
                scrollRef.current?.scrollTo({
                  top: scrollRef.current.scrollHeight,
                  behavior: "smooth",
                })
                setPinned(true)
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              <ArrowDown /> Jump to latest
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

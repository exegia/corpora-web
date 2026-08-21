import { ArrowDown, Copy } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardFrame, CardFrameAction, CardFrameHeader, CardPanel, CardFrameTitle } from "@/components/ui/card"
import { currentStep, deriveProgress, deriveSteps } from "@/lib/corpus-convert"
import StepRow from "./step-row"
import type { LogStepsProps } from "./types"
import { CardFrameFooter } from "@exegia/corpora-ui"
import { estimateRemaining, formatElapsed, isDone } from "./utils"

/**
 * The "Logs" frame: the four derived pipeline steps with their log lines,
 * a copy action in the frame header, and a jump-to-latest pill when the
 * user scrolled up.
 */
export default function LogSteps({ entry }: LogStepsProps) {
    const steps = deriveSteps(entry)
    const scrollRef = useRef<HTMLDivElement>(null)
    // Pinned = following the newest lines; scrolling up unpins.
    const [pinned, setPinned] = useState(true)
    const done = isDone(entry)
    const failed = entry.status === "error"
    const { index } = currentStep(entry)
    const completed = deriveSteps(entry).filter(step => step.state === "completed").length
    const progress = deriveProgress(entry)

    // biome-ignore lint: scrolling on log growth is the effect's whole point
    useEffect(() => {
        const el = scrollRef.current
        // Assign scrollTop instead of scrollTo(): jsdom implements only the former.
        if (pinned && el) el.scrollTop = el.scrollHeight
    }, [entry.logs.length, pinned])

    return (
        <CardFrame className="min-h-0">
            <CardFrameHeader className="px-4 py-2.5">
                <CardFrameTitle>Logs</CardFrameTitle>
                <CardFrameAction>
                    <Button
                        aria-label="Copy logs"
                        onClick={() => void navigator.clipboard.writeText(entry.logs.map(log => log.text).join("\n"))}
                        size="icon-sm"
                        type="button"
                        variant="ghost">
                        <Copy />
                    </Button>
                </CardFrameAction>
            </CardFrameHeader>
            <Card className="min-h-0">
                <CardPanel
                    className="relative max-h-72 min-h-0 flex-1 overflow-y-auto"
                    onScroll={event => {
                        const el = event.currentTarget
                        setPinned(el.scrollTop + el.clientHeight >= el.scrollHeight - 8)
                    }}
                    ref={scrollRef}>
                    <ol className="flex flex-col gap-3">
                        {steps.map(step => (
                            <StepRow key={step.id} step={step} />
                        ))}
                    </ol>
                    <div className="relative w-full flex-1">
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
                                    variant="outline">
                                    <ArrowDown /> Jump to latest
                                </Button>
                            </div>
                        )}
                    </div>
                </CardPanel>
            </Card>
            {done ||
                (failed && (
                    <CardFrameFooter>
                        <p className="ml-sm text-xs text-muted-foreground">
                            {done
                                ? `Completed in ${formatElapsed(entry)}`
                                : failed
                                  ? "Conversion failed. See the failed step above."
                                  : estimateRemaining(completed)}
                        </p>
                    </CardFrameFooter>
                ))}
        </CardFrame>
    )
}

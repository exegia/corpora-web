import type { ConversionEntry, LogTone } from "@/lib/corpus"

/** Right-panel width the conversion drawer opens at. */
export const CONVERSION_PANEL_WIDTH = 468

export const TONE_CLASSES: Record<LogTone, string> = {
  info: "text-muted-foreground",
  success: "text-success-foreground",
  error: "text-destructive",
}

export function conversionTone(state: "failed" | "completed" | "active"): {
  text: string
  fill: string
  track: string
  ring: string
} {
  if (state === "failed") {
    return {
      text: "text-destructive",
      fill: "bg-destructive",
      track: "bg-destructive/16",
      ring: "border-destructive/48",
    }
  }
  if (state === "completed") {
    return {
      text: "text-success-foreground",
      fill: "bg-success",
      track: "bg-success/16",
      ring: "border-success/48",
    }
  }
  return {
    text: "text-warning-foreground",
    fill: "bg-warning",
    track: "bg-warning/16",
    ring: "border-warning/48",
  }
}

export function isDone(entry: ConversionEntry): boolean {
  return entry.status === "ready" || entry.status === "success"
}

/** Rough remaining time from the steps still to run (~30s budget each). */
export function estimateRemaining(completedSteps: number): string {
  const minutes = Math.max(1, Math.ceil(((4 - completedSteps) * 30) / 60))
  return `Estimated ~${minutes} min remaining`
}

/** "Completed in 3 min 42 s" from the run's start/end timestamps. */
export function formatElapsed(entry: ConversionEntry): string {
  const ms = (entry.finishedAt ?? Date.now()) - entry.uploadedAt
  const total = Math.max(1, Math.round(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return minutes > 0 ? `${minutes} min ${seconds} s` : `${seconds} s`
}

/** The file extension shown as the format badge ("XML"). */
export function extensionBadge(entry: ConversionEntry): string {
  return entry.name.split(".").pop()?.toUpperCase() ?? "FILE"
}

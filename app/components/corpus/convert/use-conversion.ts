import { useRef, useState } from "react"
import { useFetcher } from "react-router"
import { uploadConversionSource } from "@/lib/corpus"
import {
  createConversionEntry,
  fabricateStats,
  runConversion,
} from "@/lib/corpus-convert"
import type { ConversionEntry } from "@/lib/corpus-convert"
import { DataError } from "@/lib/projects"

export interface ConversionController {
  entry: ConversionEntry | null
  /** Set once the terminal row is persisted — the "View corpus" target. */
  documentId: string | null
  drawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
  running: boolean
  start: (file: File) => void
  retry: () => void
  dismiss: () => void
}

/**
 * Route-local conversion state: one tracked entry driven by the simulated
 * transport in lib/corpus-convert, persisted through the route's
 * `convert-document` action once the run reaches "ready". No polling, no
 * loader involvement (docs/data-loading.md) — navigating away abandons the
 * simulated run, a documented limitation the transport seam later fixes
 * (real jobs live on the server and can be re-tracked by job id).
 */
export function useConversion(): ConversionController {
  const persistFetcher = useFetcher<{
    ok: boolean
    intent?: string
    documentId?: string
    error?: string
  }>()
  const [entry, setEntry] = useState<ConversionEntry | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const fileRef = useRef<File | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const documentId =
    persistFetcher.data?.ok && persistFetcher.data.intent === "convert-document"
      ? (persistFetcher.data.documentId ?? null)
      : null

  async function run(file: File) {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    fileRef.current = file

    const initial = createConversionEntry(file)
    setEntry(initial)
    setDrawerOpen(true)

    let path: string
    try {
      path = await uploadConversionSource(file)
    } catch (error) {
      if (controller.signal.aborted) return
      const message =
        error instanceof DataError
          ? error.message
          : "Something went wrong while uploading the file."
      setEntry({
        ...initial,
        status: "error",
        error: message,
        finishedAt: Date.now(),
        logs: [
          ...initial.logs,
          { step: "receive", text: `✗ ${message}`, tone: "error" },
        ],
      })
      return
    }
    if (controller.signal.aborted) return

    const final = await runConversion(
      initial,
      (next) => {
        if (!controller.signal.aborted) setEntry(next)
      },
      { signal: controller.signal },
    )
    if (controller.signal.aborted || final.status !== "ready") return

    // Persist the terminal successful row; the revalidation this triggers
    // refreshes the list without re-suspending it.
    const stats = fabricateStats(file.name)
    persistFetcher.submit(
      {
        intent: "convert-document",
        name: file.name.replace(/\.[^.]+$/, ""),
        source: "upload",
        path,
        filename: file.name,
        sourceFormat: final.sourceFormat ?? "",
        corpusType: "text",
        licence: stats.licence,
        language: stats.language,
        sizeBytes: String(file.size),
        docsCount: String(stats.docsCount),
        nodes: String(stats.nodes),
        words: String(stats.words),
        convertedAt: new Date().toISOString(),
      },
      { method: "post" },
    )
  }

  return {
    entry,
    documentId,
    drawerOpen,
    openDrawer: () => setDrawerOpen(true),
    closeDrawer: () => setDrawerOpen(false),
    running: entry !== null && entry.finishedAt === null,
    start: (file) => void run(file),
    retry: () => {
      if (fileRef.current) void run(fileRef.current)
    },
    dismiss: () => {
      abortRef.current?.abort()
      setEntry(null)
      setDrawerOpen(false)
    },
  }
}

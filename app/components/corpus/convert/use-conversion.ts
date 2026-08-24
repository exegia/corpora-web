import { useRef, useState } from "react"
import { useFetcher } from "react-router"
import { uploadCorpusFile } from "@/lib/corpus"
import {
  asCorpusFilename,
  detectSourceFormat,
  fetchCapabilities,
  MAX_UPLOAD_BYTES,
  SUPPORTED_EXTENSIONS,
} from "@/lib/corpora-api"
import { readCorpusArchive } from "@/lib/corpus-archive"
import {
  createConversionEntry,
  libraryTitle,
  runConversion,
} from "@/lib/corpus-convert"
import type { ConversionEntry, ConversionStepId } from "@/lib/corpus-convert"
import { extractCorpusHistory } from "@/lib/corpus-history"

export interface ConversionController {
  entry: ConversionEntry | null
  /** Set once the terminal row is persisted — the "View corpus" target. */
  documentId: string | null
  panelOpen: boolean
  openPanel: () => void
  closePanel: () => void
  running: boolean
  start: (file: File) => void
  retry: () => void
  dismiss: () => void
}

/**
 * Layout-level conversion state: one tracked entry driven against the real
 * corpora-py service (lib/corpus-convert), persisted through the /corpus
 * route's `convert-document` action once the archive is downloaded, stored,
 * and its manifest/toc/history read. No polling in loaders, no route
 * re-suspension (docs/data-loading.md). The hook mounts in AppLayout so the
 * run survives in-app navigation. The persisted `job_id` is what the
 * detail explorer uses after reload (`GET /convert/{job_id}/…`).
 */
export function useConversion(): ConversionController {
  const persistFetcher = useFetcher<{
    ok: boolean
    intent?: string
    documentId?: string
    error?: string
  }>()
  const [entry, setEntry] = useState<ConversionEntry | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
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
    setPanelOpen(true)

    const final = await runConversion(
      file,
      initial,
      (next) => {
        if (!controller.signal.aborted) setEntry(next)
      },
      { signal: controller.signal },
    )
    if (controller.signal.aborted) return
    if (final.status !== "ready" || !final.corpusBlob) return

    // Persist: read the archive's own metadata + nested-git history, store
    // the .corpus in the library bucket, then create the registry row. The
    // revalidation this triggers refreshes the list without re-suspending.
    const fail = (step: ConversionStepId, message: string) => {
      setEntry({
        ...final,
        status: "error",
        error: message,
        failedStep: step,
        finishedAt: Date.now(),
        logs: [...final.logs, { step, text: `✗ ${message}`, tone: "error" }],
      })
    }
    try {
      const blob = final.corpusBlob
      const baseName = file.name.replace(/\.[^.]+$/, "")
      const storedName = asCorpusFilename(
        final.resultFilename ?? `${baseName}.corpus`,
      )
      const corpusFile = new File([blob], storedName, {
        type: "application/zip",
      })
      const [info, commits] = await Promise.all([
        readCorpusArchive(blob),
        // History is best-effort — a corpus without a .git is still a corpus.
        extractCorpusHistory(corpusFile).catch(() => null),
      ])
      if (controller.signal.aborted) return
      const path = await uploadCorpusFile(corpusFile)
      if (controller.signal.aborted) return

      persistFetcher.submit(
        {
          intent: "convert-document",
          name: libraryTitle({
            displayName: final.displayName,
            manifestName: info.name,
            filenameStem: baseName,
          }),
          source: "upload",
          path,
          filename: corpusFile.name,
          jobId: final.jobId ?? "",
          sourceFormat: final.sourceFormat ?? "",
          corpusType: info.corpusType ?? "text",
          language: info.language ?? "",
          description: info.description ?? "",
          toc: JSON.stringify(info.sections),
          sizeBytes: String(blob.size),
          nodes: String(final.validation?.stats?.max_slot ?? ""),
          convertedAt: new Date().toISOString(),
          commits: JSON.stringify(commits ?? []),
        },
        { method: "post", action: "/corpus" },
      )
    } catch (error) {
      if (controller.signal.aborted) return
      fail(
        "index",
        error instanceof Error
          ? error.message
          : "The converted corpus could not be stored.",
      )
    }
  }

  return {
    entry,
    documentId,
    panelOpen,
    openPanel: () => setPanelOpen(true),
    closePanel: () => setPanelOpen(false),
    running: entry !== null && entry.finishedAt === null,
    start: (file) => {
      // Classify and size-check before anything is uploaded; a rejected file
      // never leaves the machine.
      const reject = (message: string) => {
        const rejected = createConversionEntry(file)
        setEntry({
          ...rejected,
          status: "error",
          error: message,
          failedStep: "receive",
          finishedAt: Date.now(),
          logs: [{ step: "receive", text: `✗ ${message}`, tone: "error" }],
        })
        setPanelOpen(true)
      }
      if (!detectSourceFormat(file.name)) {
        reject(
          `Unsupported file type. Supported: ${SUPPORTED_EXTENSIONS.join(", ")}`,
        )
        return
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        reject("This file exceeds the service's 500 MiB upload limit.")
        return
      }
      // Warm the capability posture (auth flag) once per session.
      void fetchCapabilities()
      void run(file)
    },
    retry: () => {
      if (fileRef.current) void run(fileRef.current)
    },
    dismiss: () => {
      abortRef.current?.abort()
      setEntry(null)
      setPanelOpen(false)
    },
  }
}

// Conversion pipeline for the Corpus route (feat/corpus-convert). The state
// model mirrors the corpora-py example client (UploadEntry / deriveStages in
// github.com/exegia/corpora-py example/app): statuses are STORED on a single
// tracked entry, the visible step timeline is DERIVED, never stored. The
// transport below is a client-side simulation with realistic timing;
// `runConversion` is the seam — the real implementation replaces its body
// with `POST /convert` + WebSocket/polling and feeds the same
// `onChange(entry)` updates. Route modules import ONLY from this module.

/** Mirrors corpora-py's UploadStatus verbatim. */
export type ConversionStatus =
  | "uploading"
  | "queued"
  | "converting"
  | "validating"
  | "ready"
  | "success"
  | "error"

export type ConversionStepId = "receive" | "validate" | "convert" | "index"

export type ConversionStepState = "pending" | "active" | "completed" | "failed"

export type LogTone = "info" | "success" | "error"

export interface ConversionLog {
  step: ConversionStepId
  text: string
  tone: LogTone
}

/** Verdict of the post-conversion validation (corpora-py POST /validate). */
export interface ValidationOutcome {
  status: "running" | "valid" | "invalid" | "skipped"
  reasons?: string[]
  /** CorpusStats subset the UI shows. */
  stats?: { nodes: number; words: number; docsCount: number }
}

/** The tracked upload — the UploadEntry subset this app needs. */
export interface ConversionEntry {
  id: string
  name: string
  size: number
  type: string
  status: ConversionStatus
  error: string | null
  lastModified: number
  /** When the conversion started on the client (Date.now()). */
  uploadedAt: number
  /** Ended (ready or error), for the "Completed in …" footer. */
  finishedAt: number | null
  /** `source_format` as sent to POST /convert. */
  sourceFormat: string | null
  logs: ConversionLog[]
  /** Server-assigned job id, set once POST /convert responds. */
  jobId: string | null
  validation: ValidationOutcome | null
  corpusName: string | null
  corpusSize: number | null
}

export interface ConversionStep {
  id: ConversionStepId
  title: string
  state: ConversionStepState
  logs: ConversionLog[]
}

export const CONVERSION_STEPS: ReadonlyArray<{
  id: ConversionStepId
  title: string
}> = [
  { id: "receive", title: "File received" },
  { id: "validate", title: "Validating text-fabric" },
  { id: "convert", title: "Converting to .corpus" },
  { id: "index", title: "Indexing & finalizing" },
]

const SOURCE_FORMATS: Record<string, string> = {
  xml: "text-fabric",
  tei: "tei",
}

/** Resolve the `source_format` from the filename, or null if unsupported. */
export function detectSourceFormat(filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase() ?? ""
  return SOURCE_FORMATS[ext] ?? null
}

/** Deterministic demo failures: any filename containing "fail". */
export function shouldFail(filename: string): boolean {
  return /fail/i.test(filename)
}

// FNV-1a — a stable seed so the same file always fabricates the same stats.
function hash(value: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

const LANGUAGES = ["English", "Greek", "Hebrew", "Latin", "Multi"]
const LICENCES = [
  "CC BY-SA 4.0",
  "CC BY 4.0",
  "Public domain",
  "Custom licence",
]

export interface FabricatedStats {
  nodes: number
  words: number
  docsCount: number
  language: string
  licence: string
}

/** Stable fabricated corpus stats for the simulated pipeline. */
export function fabricateStats(filename: string): FabricatedStats {
  const seed = hash(filename)
  const nodes = 8_000 + (seed % 52_000)
  return {
    nodes,
    words: nodes * (28 + (seed % 14)),
    docsCount: 40 + (seed % 860),
    language: LANGUAGES[seed % LANGUAGES.length],
    licence: LICENCES[(seed >> 3) % LICENCES.length],
  }
}

const SECTION_TITLES = [
  "Prologue",
  "Prima Pars",
  "Prima Secundae",
  "Secunda Secundae",
  "Tertia Pars",
  "Supplementum",
  "Appendix",
  "Index Rerum",
]

export interface FabricatedSection {
  title: string
  nodes: number
  words: number
}

/** Stable fabricated section rows for the detail page's Overview tab. */
export function fabricateSections(seed: string): FabricatedSection[] {
  const base = hash(seed)
  const count = 4 + (base % 3)
  return Array.from({ length: count }, (_, i) => {
    const s = hash(`${seed}:${i}`)
    const nodes = 800 + (s % 9_500)
    return {
      title: SECTION_TITLES[(base + i) % SECTION_TITLES.length],
      nodes,
      words: nodes * (30 + (s % 10)),
    }
  })
}

/** A stable, uuid-looking job id derived from the filename. */
function fabricateJobId(filename: string): string {
  const h = (n: number) => hash(`${filename}:${n}`).toString(16).padStart(8, "0")
  return `${h(1)}-${h(2).slice(0, 4)}-${h(3).slice(0, 4)}`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}

export function createConversionEntry(file: {
  name: string
  size: number
  type: string
  lastModified: number
}): ConversionEntry {
  return {
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    type: file.type || "text/xml",
    status: "uploading",
    error: null,
    lastModified: file.lastModified,
    uploadedAt: Date.now(),
    finishedAt: null,
    sourceFormat: detectSourceFormat(file.name),
    logs: [],
    jobId: null,
    validation: null,
    corpusName: null,
    corpusSize: null,
  }
}

/**
 * Which step an errored run stopped at — same derivation the corpora-py
 * example uses: no job id means the server never accepted the file.
 */
function erroredStep(entry: ConversionEntry): ConversionStepId {
  if (!entry.jobId) return "receive"
  return entry.validation ? "index" : "convert"
}

const ACTIVE_STEP: Partial<Record<ConversionStatus, ConversionStepId>> = {
  uploading: "receive",
  queued: "validate",
  converting: "convert",
  validating: "index",
}

const STEP_ORDER: ConversionStepId[] = ["receive", "validate", "convert", "index"]

/** The step currently running (or failed), and its 1-based position. */
export function currentStep(entry: ConversionEntry): {
  id: ConversionStepId
  index: number
} {
  const id =
    entry.status === "error"
      ? erroredStep(entry)
      : (ACTIVE_STEP[entry.status] ?? "index")
  return { id, index: STEP_ORDER.indexOf(id) + 1 }
}

/**
 * Pure derivation of the 4-step timeline from the tracked entry. A failure
 * marks the step it happened in; later steps stay pending.
 */
export function deriveSteps(entry: ConversionEntry): ConversionStep[] {
  const done = entry.status === "ready" || entry.status === "success"
  const failed = entry.status === "error"
  const failedAt = failed ? STEP_ORDER.indexOf(erroredStep(entry)) : -1
  const activeAt = done
    ? STEP_ORDER.length
    : failed
      ? failedAt
      : STEP_ORDER.indexOf(ACTIVE_STEP[entry.status] ?? "index")

  return CONVERSION_STEPS.map(({ id, title }, i) => ({
    id,
    title,
    state:
      failed && i === failedAt
        ? "failed"
        : i < activeAt
          ? "completed"
          : !failed && !done && i === activeAt
            ? "active"
            : done
              ? "completed"
              : "pending",
    logs: entry.logs.filter((log) => log.step === id),
  }))
}

/** Step-completion progress in [0, 1] for the drawer's progress bar. */
export function deriveProgress(entry: ConversionEntry): number {
  const steps = deriveSteps(entry)
  return steps.filter((step) => step.state === "completed").length / steps.length
}

const defaultDelay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

export interface RunConversionOptions {
  signal?: AbortSignal
  /** Injectable for tests; defaults to setTimeout. */
  delay?: (ms: number) => Promise<void>
}

/**
 * THE TRANSPORT SEAM. Walks the entry through the corpora-py status
 * sequence (uploading → queued → converting → validating → ready), calling
 * `onChange` with a fresh snapshot at every observable event. The real
 * implementation replaces this body with the POST /convert round-trip plus
 * WebSocket/polling job tracking and feeds the same updates.
 *
 * Returns the terminal entry (status "ready" or "error"). An aborted run
 * resolves with the last snapshot; it never persists anything.
 */
export async function runConversion(
  initial: ConversionEntry,
  onChange: (entry: ConversionEntry) => void,
  options: RunConversionOptions = {},
): Promise<ConversionEntry> {
  const delay = options.delay ?? defaultDelay
  const { signal } = options
  let entry = initial

  const emit = (patch: Partial<ConversionEntry>, log?: ConversionLog) => {
    entry = {
      ...entry,
      ...patch,
      logs: log ? [...entry.logs, log] : entry.logs,
    }
    onChange(entry)
  }
  const tick = async (ms: number) => {
    await delay(ms)
    return !signal?.aborted
  }

  const stats = fabricateStats(entry.name)
  const jobId = fabricateJobId(entry.name)

  // receive — the storage upload already happened in the route; these are
  // the client-side acceptance checks.
  emit(
    { status: "uploading" },
    {
      step: "receive",
      text: `> ${entry.name} (${formatBytes(entry.size)})`,
      tone: "info",
    },
  )
  if (!(await tick(500))) return entry
  emit(
    { jobId },
    {
      step: "receive",
      text: `✓ File type validated — source "${entry.name.split(".").pop()}"`,
      tone: "success",
    },
  )

  // validate — parse nodes and feature data.
  if (!(await tick(600))) return entry
  emit(
    { status: "queued" },
    {
      step: "validate",
      text: "> Parsing nodes and feature data…",
      tone: "info",
    },
  )
  for (const share of [0.41, 0.78]) {
    if (!(await tick(900))) return entry
    emit(
      {},
      {
        step: "validate",
        text: `> ${Math.round(stats.nodes * share).toLocaleString("en-US")} / ${stats.nodes.toLocaleString("en-US")} nodes validated`,
        tone: "info",
      },
    )
  }
  if (!(await tick(900))) return entry
  emit(
    {},
    {
      step: "validate",
      text: `✓ Validation passed — ${stats.nodes.toLocaleString("en-US")} nodes parsed`,
      tone: "success",
    },
  )

  // convert — the server-side build; the deterministic demo failure lives
  // here, mirroring where a real conversion actually breaks.
  if (!(await tick(500))) return entry
  emit(
    { status: "converting" },
    {
      step: "convert",
      text: "> Building Text-Fabric dataset…",
      tone: "info",
    },
  )
  if (!(await tick(1200))) return entry
  if (shouldFail(entry.name)) {
    emit(
      {
        status: "error",
        error: `IndexError — job ${jobId}`,
        finishedAt: Date.now(),
      },
      {
        step: "convert",
        text: `✗ IndexError — job ${jobId}`,
        tone: "error",
      },
    )
    return entry
  }
  emit(
    {},
    {
      step: "convert",
      text: `✓ ${stats.nodes.toLocaleString("en-US")} nodes written to .corpus`,
      tone: "success",
    },
  )

  // index — the POST /validate round-trip plus final packaging.
  if (!(await tick(500))) return entry
  emit(
    {
      status: "validating",
      validation: { status: "running" },
    },
    { step: "index", text: "> Building corpus index…", tone: "info" },
  )
  if (!(await tick(1100))) return entry
  emit(
    {
      status: "ready",
      finishedAt: Date.now(),
      validation: {
        status: "valid",
        stats: {
          nodes: stats.nodes,
          words: stats.words,
          docsCount: stats.docsCount,
        },
      },
      corpusName: entry.name.replace(/\.[^.]+$/, ".corpus"),
      corpusSize: Math.round(entry.size * 1.6),
    },
    { step: "index", text: "✓ Index built — corpus ready", tone: "success" },
  )
  return entry
}

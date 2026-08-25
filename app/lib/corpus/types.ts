import { type CorpusCommit, type CorpusSource } from "@/lib/projects"

export interface CorpusCommitInput {
    sha: string
    message: string
    authorName: string | null
    authorEmail: string | null
    branch: string | null
    committedAt: string | null
}

/** Manifest "type" in the corpora-py contract (ICorpusManifest.type). */
export type CorpusType = "text" | "web" | "parallel" | "speech" | "docs"

export interface CorpusDocument {
    id: string
    name: string
    source: CorpusSource
    /** Storage path for uploads, the full URL for Hugging Face. */
    path: string
    filename: string | null
    /** Conversion job id for GET /convert/{job_id}/… explore. Null on uploads. */
    jobId: string | null
    uploadedAt: string
    commits: CorpusCommit[]
    /** Conversion metadata (corpora-py contract) — null on legacy rows. */
    corpusType: CorpusType | null
    /** `source_format` as sent to POST /convert ("text-fabric", "tei", …). */
    sourceFormat: string | null
    licence: string | null
    language: string | null
    sizeBytes: number | null
    docsCount: number | null
    nodes: number | null
    words: number | null
    status: "converted" | "uploaded" | null
    convertedAt: string | null
    /** Manifest description, captured from the archive at conversion time. */
    description: string | null
    /** toc.yml section rows captured at conversion time (see corpus-archive). */
    toc: CorpusSection[] | null
}

/** One toc.yml section row (mirrors corpus-archive's CorpusSection). */
export interface CorpusSection {
    title: string
    nodes: number | null
    words: number | null
}

export interface CommitRow {
    id: string
    sha: string
    message: string
    author_name: string | null
    author_email: string | null
    branch: string | null
    committed_at: string | null
}

export interface DocumentRow {
    id: string
    name: string
    source: CorpusSource
    path: string
    filename: string | null
    job_id: string | null
    uploaded_at: string
    corpus_type: CorpusType | null
    source_format: string | null
    licence: string | null
    language: string | null
    size_bytes: number | null
    docs_count: number | null
    nodes: number | null
    words: number | null
    status: "converted" | "uploaded" | null
    converted_at: string | null
    description: string | null
    toc: CorpusSection[] | null
    corpus_commits: CommitRow[]
}

/** Metadata a conversion attaches to its document (corpora-py contract). */
export interface CorpusMetadataInput {
    corpusType?: CorpusType | null
    sourceFormat?: string | null
    licence?: string | null
    language?: string | null
    sizeBytes?: number | null
    docsCount?: number | null
    nodes?: number | null
    words?: number | null
    status?: "converted" | "uploaded" | null
    convertedAt?: string | null
    description?: string | null
    toc?: CorpusSection[] | null
    jobId?: string | null
}


export interface CorpusArchiveInfo {
  name: string | null
  description: string | null
  language: string | null
  corpusType: CorpusType | null
  version: string | null
  sections: CorpusSection[]
}


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
  /** Raw CorpusStats (max_slot, node_types, node_features, edge_features). */
  stats?: Record<string, number>
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
  /** `source_format` as sent to POST /convert ("tei", "epub", …). */
  sourceFormat: string | null
  logs: ConversionLog[]
  /** Server-assigned job id, set once POST /convert responds. */
  jobId: string | null
  /** Source-derived library title from the job payload. */
  displayName: string | null
  /** Slug filename the service will use for the downloaded archive. */
  resultFilename: string | null
  validation: ValidationOutcome | null
  corpusName: string | null
  corpusSize: number | null
  /** The downloaded archive, present once status is "ready". */
  corpusBlob: Blob | null
  /** The step a failed run stopped in (set when status turns "error"). */
  failedStep: ConversionStepId | null
}

export interface ConversionStep {
  id: ConversionStepId
  title: string
  state: ConversionStepState
  logs: ConversionLog[]
}


export interface RunConversionOptions {
  signal?: AbortSignal
  /** Injectable for tests; defaults to setTimeout. */
  delay?: (ms: number) => Promise<void>
}


export interface HubCommit {
  id: string
  title: string
  message: string
  authors?: { user: string }[]
  date: string
}


export type Stats = {
  type: "file" | "dir"
  mode: number
  size: number
  ino: number
  mtimeMs: number
  ctimeMs: number
  uid: number
  gid: number
  dev: number
  isFile: () => boolean
  isDirectory: () => boolean
  isSymbolicLink: () => boolean
}


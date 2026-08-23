import { getSupabase } from "@/lib/supabase"

// The single HTTP seam to the corpora-py conversion service (constitution
// Principle II): every request to api.exegia.co lives here — route modules
// and components never fetch it directly. Types mirror the backend verbatim;
// see specs/004-connect-with-py/contracts/corpora-api.md for the contract
// and research.md for the poll-only transport rationale.

export const CORPORA_API_URL: string =
  import.meta.env.VITE_CORPORA_API_URL ?? "https://api.exegia.co"

export type JobStatus = "queued" | "running" | "succeeded" | "failed"

/** ConversionJob.to_dict() — identical shape for polling and WS frames. */
export interface JobStatusMessage {
  id: string
  source_format: string
  name: string
  status: JobStatus
  created_at: number
  started_at: number | null
  finished_at: number | null
  error: string | null
  logs: string[]
  last_log: string | null
  download_ready: boolean
}

/**
 * Formats the service can actually convert. The server enum also contains
 * "xml", but no converter is registered for it (422 after upload) — never
 * send it; `.xml` routes to "tei" (corpora-py#105).
 */
export type SourceFormat =
  | "epub"
  | "html"
  | "tei"
  | "pdf"
  | "plain"
  | "tf_zip"
  | "tei_zip"

const EXTENSION_TO_FORMAT: Record<string, SourceFormat> = {
  epub: "epub",
  html: "html",
  xml: "tei",
  tei: "tei",
  pdf: "pdf",
  txt: "plain",
  zip: "tf_zip",
}

/** The `source_format` for a filename, or null when unsupported. */
export function detectSourceFormat(filename: string): SourceFormat | null {
  const ext = filename.split(".").pop()?.toLowerCase() ?? ""
  return EXTENSION_TO_FORMAT[ext] ?? null
}

/** Human list for "unsupported type" messages, kept in one place. */
export const SUPPORTED_EXTENSIONS = Object.keys(EXTENSION_TO_FORMAT).map(
  (ext) => `.${ext}`,
)

/** The service rejects uploads above this (413). */
export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024

export type CorporaApiErrorKind =
  | "unreachable"
  | "unauthorized"
  | "not-found"
  | "not-ready"
  | "too-large"
  | "unsupported"
  | "queue-full"
  | "read-only"
  | "server"

export class CorporaApiError extends Error {
  kind: CorporaApiErrorKind
  status?: number

  constructor(kind: CorporaApiErrorKind, message: string, status?: number) {
    super(message)
    this.name = "CorporaApiError"
    this.kind = kind
    this.status = status
  }
}

const KIND_BY_STATUS: Record<number, CorporaApiErrorKind> = {
  401: "unauthorized",
  403: "read-only",
  404: "not-found",
  409: "not-ready",
  413: "too-large",
  422: "unsupported",
  429: "queue-full",
}

async function errorFrom(response: Response): Promise<CorporaApiError> {
  let detail: string | null = null
  try {
    const body = (await response.json()) as { detail?: unknown }
    if (typeof body?.detail === "string") detail = body.detail
  } catch {
    // Non-JSON error body — the status code carries the meaning.
  }
  const kind = KIND_BY_STATUS[response.status] ?? "server"
  return new CorporaApiError(
    kind,
    detail ?? `The conversion service replied ${response.status}.`,
    response.status,
  )
}

/**
 * Fetch with the Supabase bearer token attached whenever a session exists.
 * The deployment currently runs auth_required:false, so this is dormant —
 * but flipping auth on server-side requires no client change (research R4).
 */
async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  try {
    const { data } = await getSupabase().auth.getSession()
    const token = data.session?.access_token
    if (token) headers.set("Authorization", `Bearer ${token}`)
  } catch {
    // No session available — the service is open today; proceed anonymous.
  }
  let response: Response
  try {
    response = await fetch(`${CORPORA_API_URL}${path}`, { ...init, headers })
  } catch {
    throw new CorporaApiError(
      "unreachable",
      "The conversion service could not be reached.",
    )
  }
  if (!response.ok) throw await errorFrom(response)
  return response
}

export interface Capabilities {
  authRequired: boolean
  hubWritable: boolean
}

/** Pessimistic posture until the service has answered once. */
const UNKNOWN_CAPABILITIES: Capabilities = {
  authRequired: true,
  hubWritable: false,
}

let capabilitiesPromise: Promise<Capabilities> | null = null

/** Memoized; a failed probe resolves UNKNOWN and allows a later retry. */
export function fetchCapabilities(): Promise<Capabilities> {
  capabilitiesPromise ??= apiFetch("/capabilities")
    .then(async (response) => {
      const body = (await response.json()) as {
        auth_required?: boolean
        hub_writable?: boolean
      }
      return {
        authRequired: body.auth_required ?? true,
        hubWritable: body.hub_writable ?? false,
      }
    })
    .catch(() => {
      capabilitiesPromise = null
      return UNKNOWN_CAPABILITIES
    })
  return capabilitiesPromise
}

/** POST /convert — multipart upload; 202 with the job id. */
export async function createConversion(input: {
  file: File
  sourceFormat: SourceFormat
  name: string
  description?: string
}): Promise<{ jobId: string }> {
  const form = new FormData()
  form.set("file", input.file)
  form.set("source_format", input.sourceFormat)
  form.set("name", input.name)
  form.set("description", input.description ?? "")
  const response = await apiFetch("/convert", { method: "POST", body: form })
  const body = (await response.json()) as { job_id: string }
  return { jobId: body.job_id }
}

/**
 * GET /convert/{id}. On this deployment the poll is not just a status read:
 * the in-flight request is what advances the frozen function instance.
 */
export async function getConversion(jobId: string): Promise<JobStatusMessage> {
  const response = await apiFetch(`/convert/${encodeURIComponent(jobId)}`)
  return (await response.json()) as JobStatusMessage
}

/** GET /convert/{id}/download — the produced .corpus archive. */
export async function downloadConversion(jobId: string): Promise<Blob> {
  const response = await apiFetch(
    `/convert/${encodeURIComponent(jobId)}/download`,
  )
  return response.blob()
}

export interface ValidationReport {
  status: "valid" | "invalid" | "skipped"
  reasons?: string[]
  /** CorpusStats: max_slot, node_types, node_features, edge_features. */
  stats?: Record<string, number>
}

/**
 * POST /validate by job id. An annotation, never a gate — any failure
 * (including an unreachable service) resolves "skipped" rather than throwing.
 */
export async function validateConversion(
  jobId: string,
): Promise<ValidationReport> {
  try {
    const response = await apiFetch("/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId }),
    })
    const body = (await response.json()) as {
      valid?: boolean
      reasons?: string[]
      stats?: Record<string, number>
    }
    return {
      status: body.valid ? "valid" : "invalid",
      reasons: body.reasons,
      stats: body.stats,
    }
  } catch {
    return { status: "skipped" }
  }
}

// ── Hub storage (corpus-detail) ──────────────────────────────────────────────
// Detail endpoints serve published Hub archives only, not conversion jobs.
// See specs/004-connect-with-py/contracts/corpora-api.md ("Adjacent surface").

export interface StoredCorpus {
  filename: string
  size_bytes: number | null
  repo_id: string
  url: string
}

export interface IndexChild {
  title: string
  ref: string
}

export interface IndexItem {
  title: string
  ref: string
  children: IndexChild[]
}

export interface IndexSections {
  levels: string[]
  items: IndexItem[]
}

export interface NodeTypeCount {
  type: string
  count: number
}

/** GET /storage/{filename}/index */
export interface CorpusIndex {
  toc: unknown
  sections: IndexSections | null
  node_types: NodeTypeCount[]
}

export interface CorpusPassage {
  ref: string
  text: string
  node?: number
}

/** GET /storage/{filename}/content */
export interface ContentResponse {
  ref: string | null
  format: string
  passages: CorpusPassage[]
  total: number
  offset: number
  limit: number
  next_offset: number | null
}

export interface ContentQuery {
  ref?: string | null
  fmt?: string | null
  offset?: number
  limit?: number
}

/** GET /storage/{filename}/nodes/{node} */
export interface CorpusNode {
  node: number
  otype: string
  is_slot: boolean
  slot_type: string | null
  first_slot: number | null
  last_slot: number | null
  section_ref: string | null
  text: string
  features: Record<string, unknown>
  annotation: Record<string, unknown> | null
  node_types: string[]
}

export interface CorpusArchive {
  filename: string
  index: CorpusIndex
}

function storageBase(filename: string): string {
  return `/storage/${encodeURIComponent(filename)}`
}

/** Turn a library name or upload filename into a Hub `.corpus` archive name. */
export function asCorpusFilename(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return ""
  if (/\.corpus$/i.test(trimmed)) return trimmed
  const stem = trimmed.replace(/\.[^./]+$/, "")
  return `${stem}.corpus`
}

/** Hub filenames to try for a library document, in lookup order. */
export function hubFilenameCandidates(document: {
  filename: string | null
  name: string
}): string[] {
  const seen = new Set<string>()
  const names: string[] = []
  for (const raw of [document.filename, document.name]) {
    if (!raw) continue
    const filename = asCorpusFilename(raw)
    const key = filename.toLowerCase()
    if (!filename || seen.has(key)) continue
    seen.add(key)
    names.push(filename)
  }
  return names
}

/** GET /storage — published Hub archives. */
export async function listStoredCorpora(): Promise<StoredCorpus[]> {
  const response = await apiFetch("/storage")
  return (await response.json()) as StoredCorpus[]
}

/** GET /storage/{filename}/index */
export async function fetchCorpusIndex(filename: string): Promise<CorpusIndex> {
  const response = await apiFetch(`${storageBase(filename)}/index`)
  return (await response.json()) as CorpusIndex
}

/** GET /storage/{filename}/content */
export async function fetchCorpusContent(
  filename: string,
  query: ContentQuery = {},
): Promise<ContentResponse> {
  const params = new URLSearchParams()
  if (query.ref != null && query.ref !== "") params.set("ref", query.ref)
  if (query.fmt != null && query.fmt !== "") params.set("fmt", query.fmt)
  if (query.offset != null) params.set("offset", String(query.offset))
  if (query.limit != null) params.set("limit", String(query.limit))
  const suffix = params.toString() ? `?${params}` : ""
  const response = await apiFetch(`${storageBase(filename)}/content${suffix}`)
  return (await response.json()) as ContentResponse
}

/** GET /storage/{filename}/nodes/{node} */
export async function fetchCorpusNode(
  filename: string,
  node: number,
): Promise<CorpusNode> {
  const response = await apiFetch(`${storageBase(filename)}/nodes/${node}`)
  return (await response.json()) as CorpusNode
}

/** GET /storage/{filename}/download — the published .corpus archive. */
export async function downloadStoredCorpus(filename: string): Promise<Blob> {
  const response = await apiFetch(`${storageBase(filename)}/download`)
  return response.blob()
}

function matchesHubFilename(
  stored: string,
  stems: Set<string>,
): boolean {
  const stem = stored.replace(/\.corpus$/i, "").toLowerCase()
  return stems.has(stem) || stems.has(stored.toLowerCase())
}

/**
 * Resolve a library document to a published Hub archive. Lists Hub storage
 * first so a miss is a 200 (not a 404 in the console), then loads that
 * archive's index. Direct `/index` lookups run only when listing itself
 * fails. Returns null when the Hub has no match or is unreachable.
 */
export async function loadCorpusArchive(document: {
  filename: string | null
  name: string
}): Promise<CorpusArchive | null> {
  const candidates = hubFilenameCandidates(document)
  const stems = new Set(
    candidates.map((name) => name.replace(/\.corpus$/i, "").toLowerCase()),
  )
  try {
    const listed = await listStoredCorpora()
    const match = listed.find((item) => matchesHubFilename(item.filename, stems))
    if (!match) return null
    const index = await fetchCorpusIndex(match.filename)
    return { filename: match.filename, index }
  } catch (error) {
    if (error instanceof CorporaApiError && error.kind === "unreachable") {
      return null
    }
  }
  for (const filename of candidates) {
    try {
      const index = await fetchCorpusIndex(filename)
      return { filename, index }
    } catch (error) {
      if (error instanceof CorporaApiError && error.kind === "unreachable") {
        return null
      }
    }
  }
  return null
}

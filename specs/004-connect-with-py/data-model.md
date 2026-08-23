# Data Model & Module Design (Phase 1)

## New module: `app/lib/corpora-api.ts` — the single HTTP seam (Principle II)

Everything that talks to api.exegia.co lives here; routes and components never
fetch directly. Types mirror the backend verbatim.

```ts
export const CORPORA_API_URL =
  import.meta.env.VITE_CORPORA_API_URL ?? "https://api.exegia.co"

export type JobStatus = "queued" | "running" | "succeeded" | "failed"

/** ConversionJob.to_dict() — identical for polling and WS. */
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

export type SourceFormat =
  | "epub" | "html" | "tei" | "pdf" | "plain" | "tf_zip" | "tei_zip"
// NOTE: "xml" exists in the server enum but has no converter (422) — never send it.

/** .xml routes to tei (matches the corpora-py example client). */
export function detectSourceFormat(filename: string): SourceFormat | null
// .epub→epub  .html→html  .xml→tei  .tei→tei  .pdf→pdf  .txt→plain  .zip→tf_zip

export interface Capabilities { authRequired: boolean; hubWritable: boolean }
export function fetchCapabilities(): Promise<Capabilities>  // memoized; UNKNOWN = {authRequired:true, hubWritable:false}

export class CorporaApiError extends Error {
  kind: "unreachable" | "unauthorized" | "not-found" | "not-ready"
      | "too-large" | "unsupported" | "queue-full" | "read-only" | "server"
  status?: number
}

export function createConversion(input: {
  file: File; sourceFormat: SourceFormat; name: string; description?: string
}): Promise<{ jobId: string }>                       // POST /convert (multipart)
export function getConversion(jobId: string): Promise<JobStatusMessage>  // GET /convert/{id}
export function downloadConversion(jobId: string): Promise<Blob>         // GET /convert/{id}/download
export interface ValidationReport {
  status: "valid" | "invalid" | "skipped"
  reasons?: string[]
  stats?: Record<string, number>   // CorpusStats: max_slot, node_types, node_features, edge_features
}
export function validateConversion(jobId: string): Promise<ValidationReport> // POST /validate {job_id}; never throws → "skipped"
```

`apiFetch` (internal): merges `Authorization: Bearer <token>` from
`getSupabase().auth.getSession()` when present (R4); maps HTTP statuses to
`CorporaApiError.kind` (413→too-large, 422→unsupported, 429→queue-full,
409→not-ready, 404→not-found, 401→unauthorized, 403→read-only, 5xx→server,
network→unreachable).

## New module: `app/lib/corpus-archive.ts`

Reads authentic metadata out of a downloaded `.corpus` blob. Shares the fflate
unzip with `corpus-history.ts` (refactor its `unzipSync` call into a small
shared helper so the archive is decompressed once per flow where practical).

```ts
export interface CorpusSection { title: string; nodes: number | null; words: number | null }
export interface CorpusArchiveInfo {
  name: string | null
  description: string | null
  language: string | null          // manifest "language"
  corpusType: CorpusType | null    // manifest "type" mapped onto the app enum; unknown → "text"
  version: string | null
  sections: CorpusSection[]        // from toc.yml; [] when absent
}
export function readCorpusArchive(blob: Blob | File): Promise<CorpusArchiveInfo>
```

Parsing uses the `yaml` package (justified in plan.md Complexity Tracking).
Absent/unparseable manifest or toc degrades field-by-field to null/[] — never
throws for metadata; only an unreadable ZIP throws `DataError("validation")`.

## Changed module: `app/lib/corpus-convert.ts`

Public surface (types, `CONVERSION_STEPS`, `ConversionEntry`, `deriveSteps`,
`deriveProgress`, `currentStep`, `createConversionEntry`) is **unchanged** —
components and route tests keep working. Changes:

- `runConversion(entry, onChange, {signal, delay?})` body becomes the real
  transport: `createConversion` → poll `getConversion` every 2 s (injectable
  `delay`) → on `succeeded`: `validating` status, `validateConversion`,
  `downloadConversion` → emit `ready` with the blob handed back on the entry
  (`ConversionEntry` gains `corpusBlob?: Blob` transient field, and
  `validation.stats` now carries the real CorpusStats).
- Status/log mapping per research.md R5; server `error` string lands verbatim
  in the failed step's log line.
- `detectSourceFormat` moves to `corpora-api.ts` (re-export removed;
  callers updated). `fabricateStats`/`fabricateSections` deleted;
  their tests removed. `shouldFail` deleted (failures are real now).
- `formatBytes` stays (UI helper).

## Changed flow: persist on success (`use-conversion.ts` + `corpus.tsx` action)

1. `runConversion` resolves `ready` with `corpusBlob`.
2. Hook: `readCorpusArchive(blob)` + `extractCorpusHistory(blobAsFile)` (real
   nested-git commits) in parallel.
3. Hook: `uploadCorpusFile(new File([blob], `${name}.corpus`))` — existing
   `.corpus` guard passes; the *source* upload to `conversions/` is no longer
   needed (the archive is the durable artifact) — drop `uploadConversionSource`
   usage from the convert path.
4. Fetcher `convert-document`: existing fields + `description`, `toc`
   (JSON-stringified sections), real `language`/`corpusType` from the archive,
   `nodes` from validation stats (`max_slot`), `sizeBytes` = archive size,
   `words`/`docsCount` null when unknown (columns are nullable; UI shows "—").
   Commits array = real history.

## Schema (additive, nullable — Principle IV)

```sql
alter table public.corpus_documents
  add column if not exists description text,
  add column if not exists toc         jsonb;   -- CorpusSection[] captured at conversion
```

`CorpusDocument` gains `description: string | null`, `toc: CorpusSection[] | null`.
Detail Overview renders `document.toc ?? []` with an explicit empty state;
`fabricateSections` call removed from `corpus.$documentId.tsx`.

## MCP (dev tooling)

`.mcp.json` at repo root:

```json
{ "mcpServers": { "corpora": { "type": "http", "url": "https://api.exegia.co/mcp/" } } }
```

Documented in quickstart.md; read-only tool set on prod (write tools absent).

## Test surfaces (Principle III)

- `corpora-api.test.ts`: `fetch` mocked — error-kind mapping table, bearer
  attachment when a session exists, capabilities memoization, multipart body.
- `corpus-archive.test.ts`: fixture zip built with fflate in-test — manifest/
  toc parsing, per-field degradation, invalid zip throws.
- `corpus-convert.test.ts`: `@/lib/corpora-api` mocked — status walk
  queued→running→succeeded with real-shaped payloads; mid-flight 404 →
  error; failed job carries server error; abort stops polling.
- Route tests: unchanged mocking of `runConversion`; `convert-document`
  action asserted with the new fields.

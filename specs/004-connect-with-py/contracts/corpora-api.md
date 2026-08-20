# Contract: corpora-py backend (api.exegia.co)

Verified 2026-08-20 against the live deployment and the `../corpora-py`
checkout. This is the subset corpora-web consumes, plus the surrounding
surface for reference.

## Consumed by corpora-web

| Method & path | Request | Success | Errors |
|---|---|---|---|
| `GET /capabilities` | — | `{auth_required: bool, hub_writable: bool}` | — (unauthenticated always) |
| `POST /convert` | multipart: `file`, `source_format` (see enum), `name`, `description?` | 202 `{job_id, status_url, ws_url}` | 413 >500 MiB · 422 unknown format · 429 queue full (max 50 pending) |
| `GET /convert/{job_id}` | — | 200 `JobStatusMessage` | 404 unknown/foreign job |
| `GET /convert/{job_id}/download` | — | 200 `.corpus` bytes | 409 `"Job is {status}, not ready"` · 404 |
| `POST /validate` | `{job_id}` (also accepts `{corpus}` or `{path}`) | 200 `{valid, stats, reasons, checks}` | 404 |
| `GET /health` | — | `{status:"ok"}` | — |

### JobStatusMessage (poll and WS frames are byte-identical)

```ts
{
  id: string
  source_format: string
  name: string
  status: "queued" | "running" | "succeeded" | "failed"
  created_at: number            // epoch seconds (float)
  started_at: number | null
  finished_at: number | null
  error: string | null          // sanitized: "Conversion failed: {ExcType} (job id {id})"
  logs: string[]                // ≤ 50 lines; ~3 coarse lines per job; NO progress %
  last_log: string | null
  download_ready: boolean       // status == succeeded && result file exists
}
```

### source_format enum

`epub | html | xml | tei | pdf | plain | tf_zip | tei_zip` — **do not send
`xml`**: it is in the enum but has no converter and 422s. Client mapping:
`.epub→epub · .html→html · .xml→tei · .tei→tei · .pdf→pdf · .txt→plain · .zip→tf_zip`.

### Polling state machine (client)

```
submit ──POST /convert──▶ queued ──▶ running ──▶ succeeded ──▶ POST /validate ──▶ GET download ──▶ done
   │            │2s poll loop: GET /convert/{id} every 2s│          (annotates,        (409 if
   │            │                                        │           never gates)       not ready)
   ├─ 413/422/429/network ─▶ failed (specific message)   │
   │            ├─ status=failed ─▶ failed (server error string)
   │            └─ 404 after prior 2xx ─▶ failed ("service no longer knows this job")
```

Poll cadence 2 s. **Polling is mandatory on this deployment**: WebSockets
half-work (idle sockets killed mid-job) and the in-flight request is what
advances the frozen function instance. Any pre-terminal WS close must never be
treated as terminal — v1 simply does not open one.

### Auth (dormant today: `auth_required:false`)

- HTTP: `Authorization: Bearer <supabase access token>`; verified against the
  project's JWKS, audience `authenticated`.
- WS (unused in v1): also `?token=` query param.
- 401 `{detail: "Missing bearer token" | "Invalid or expired token"}`; WS
  close 4401; unknown job WS close 4404.
- CORS is `*` with `allow_credentials:false` — bearer header only, no cookies.
- Exempt paths: `/health`, `/`, `/capabilities`, `/docs`, `/openapi.json`.

## Adjacent surface (not consumed in v1)

- `WS /convert/{job_id}/ws` — same payload pushed on status/log change, 0.5 s
  server-side poll; unreliable on Vercel (see above).
- `/storage` family (HF-Hub backed; prod read-only → POST/DELETE/PATCH 403):
  list/get/upload/download/delete + `/storage/{filename}/manifest|index|content|nodes`.
  Detail endpoints serve **published archives only** — not job results.
- `/ingest` family — 503 on prod (docling uninstalled).
- `/mcp/` — FastMCP streamable HTTP, stateless. Read tools on prod:
  `validate_corpus, list_corpora, describe_corpus, list_features,
  describe_feature, get_text_formats, search, search_continue, search_csv,
  search_syntax_guide, get_passages, get_node_features, storage_list_corpora,
  storage_corpus_info, storage_download_corpus, corpus_manifest_get,
  corpus_node_get, corpus_index, corpus_content`. Write tools are not
  registered while read-only.

## `.corpus` archive layout (client-parsed)

`manifest.yml` (uid, name, description, version, language, languageCode,
type, format:"corpus", format_version, category, written_date, tocFile,
datasetId, projectId, assets, thumbnail) · `toc.yml` (section tree) ·
`assets/` · `corpora/` (*.tf + .cfm cache) · `.git/` (history snapshot —
already read by `extractCorpusHistory`).

## Service limits

500 MiB max upload · 50 pending jobs · 2 concurrent conversions ·
5-minute per-request cap (Vercel `maxDuration: 300`) · jobs are in-memory,
per-instance, unlisted, and lost on redeploy.

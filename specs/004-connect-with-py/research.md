# Research: corpora-py backend integration (Phase 0)

Sources: live probes of https://api.exegia.co (2026-08-20) and the local
sibling checkout `../corpora-py`. File:line citations are into that checkout.

## Verified backend facts

### Deployment & capabilities
- `api.exegia.co` is the Vercel project `corpora-py` (single FastAPI function,
  `maxDuration: 300`; corpora-py `vercel.json`, CLAUDE.md:123-125).
- `GET /capabilities` → `{"auth_required": false, "hub_writable": false}`
  (app.py:166-179; `hub_writable = not settings.hf_read_only`).
- CORS: `allow_origins=["*"]`, `allow_credentials=False`, all methods/headers
  (app.py:140-151) — any web origin may call it; cookie auth impossible,
  bearer header required.
- `/ingest` is permanently 503 on prod (docling uninstalled by the Vercel
  installCommand; ingest_api.py:118-123, corpora-py CLAUDE.md:100-107).

### Conversion API
- `POST /convert` multipart: `file`, `source_format`, `name`, `description`
  → 202 `{job_id, status_url, ws_url}`; 422 unknown format; 413 > 500 MiB
  (`_MAX_UPLOAD_BYTES`, api.py:67); 429 queue full (max_pending 50,
  jobs.py:210-213); 2 conversion workers globally (jobs.py:158-169).
- Job payload — poll `GET /convert/{job_id}` and each WS frame are the SAME
  dict, `ConversionJob.to_dict()` (jobs.py:90-106):
  `{id, source_format, name, status, created_at, started_at, finished_at,
  error, logs, last_log, download_ready}`;
  `status ∈ queued|running|succeeded|failed` (jobs.py:39-43); `logs` capped at
  50 lines, in practice 3 coarse lines per job (api.py:155-184) — **no
  progress percentage exists**.
- `GET /convert/{job_id}/download` → the `.corpus` blob; 409 unless SUCCEEDED
  (api.py:273-281).
- `POST /validate {job_id}` → `{valid, stats, reasons, checks}` — an
  annotation, never a gate (validation_api.py:128; example manager.ts:106-137).
- `source_format` enum: `epub|html|xml|tei|pdf|plain|tf_zip|tei_zip`
  (parsers/schema.py:29-37) but **`xml` has no registered converter** and
  422s (converters/__init__.py:23-31). The reference client maps `.xml → tei`
  (example source-format.ts).

### Job-store reality (drives the failure model)
- In-memory, per-process dict; no TTL; not shared across Vercel instances
  (jobs.py:130-332; api.py:50-55 has the "needs a TTL reap" TODO).
  A poll can hit an instance that never saw the job → **mid-flight 404 is a
  normal state**, and a redeploy forgets every job.
- Ownership scoping exists (`owner` = JWT `sub`, jobs.py:88, 108-127) but with
  `auth_required:false` every job is visible to anyone holding its id.

### Transport decision input
- corpora-py CLAUDE.md:108-116 verbatim: WebSockets **half-work** on Vercel —
  the handshake succeeds and pushes current status, but idle sockets are
  killed mid-job, and the conversion thread only advances **while a request is
  in flight** (frozen function instance). The example client's own docstring
  (use-socket.ts:66-79) says Vercel Functions "don't support WebSockets at
  all" and that polling "is also the only thing that advances the conversion".
- WS close codes: 4404 unknown/foreign job, 4401 auth failure — both before
  accept (websocket.py:33-51, auth.py:60, 116).

### Auth (future-proofing)
- `AuthMiddleware` (raw ASGI, auth.py) verifies a **Supabase JWT against
  JWKS** (`SUPABASE_JWKS_URL` or derived from `PROJECT_REF`; audience
  `authenticated`). HTTP: `Authorization: Bearer`; WS also accepts `?token=`.
  Exempt: `/health`, `/`, `/capabilities`, `/docs`, `/openapi.json`. Today
  `AUTH_REQUIRED=false` on prod.

### Detail data
- `/storage/{filename}/manifest|index|content|nodes` operate on archives in
  the HF-Hub storage repo only (corpus_detail_api.py); prod is read-only, so
  **job results cannot be published and are unreachable via these endpoints**.
- The `.corpus` archive itself contains `manifest.yml` (ICorpusManifest:
  uid, name, description, version, language, languageCode, type, category,
  written_date…), `toc.yml`, `corpora/` and a nested `.git` snapshot
  (convert_to_corpus.py:4-8) — this repo's `extractCorpusHistory` already
  reads that `.git`.

### MCP
- FastMCP mounted at `/mcp` (streamable HTTP, `stateless_http=True`;
  app.py:116, 152). Read tools always registered (list/describe corpus,
  features, search family, passages, storage list/info/download, manifest/
  index/content/node get); write tools (`storage_upload_corpus`,
  `storage_delete_corpus`, `corpus_manifest_update`, `corpus_node_annotate`)
  are **not registered** when read-only — absent from `tools/list` on prod.

## Decisions

### R1 — Transport: poll-only, 2 s interval
**Decision**: Track jobs exclusively by polling `GET /convert/{job_id}` every
2 s (injectable delay for tests). No WebSocket code path in v1.
**Rationale**: On the target deployment polling is not merely a fallback — it
is what advances the job; a WS-first client would hang exactly on the long
conversions that matter. Poll and WS payloads are identical, so nothing is
lost. **Alternatives**: WS with poll fallback (the example client's approach —
adds a failure mode we cannot win on this deployment); WS only (broken by
design here).

### R2 — Authentic metadata: client-side archive parsing
**Decision**: After download, read `manifest.yml` + `toc.yml` from the archive
in the browser (fflate unzip already in the bundle; `yaml` parser added) and
persist name/language/type/description + toc sections to Supabase.
**Rationale**: The backend cannot serve detail data for unpublished job
results (read-only Hub), and fabricated data violates the spec's SC-003.
**Alternatives**: publish-to-Hub then use detail endpoints (403 on prod);
upstream `GET /convert/{job_id}/manifest|index` (filed as ticket 2 — adopt
when it lands and thin the client parser).

### R3 — Job persistence: none in v1
**Decision**: Conversion state stays route-local as in #65; a page reload
abandons tracking. No localStorage jobId store.
**Rationale**: The backend forgets jobs on instance recycle anyway; a resume
feature built on that foundation would be unreliable theater. Blocked on
upstream ticket 1 (durable, listable jobs); revisit then.
**Alternatives**: localStorage persistence like the example app (kept there
because its desktop context has a stable single-process server).

### R4 — Auth posture: bearer-ready now
**Decision**: `apiFetch` attaches the current Supabase session's access token
whenever one exists; a 401 surfaces as a sign-in prompt. No client change will
be needed when `AUTH_REQUIRED` flips on.

### R5 — Status mapping (server → existing ConversionEntry statuses)
`queued→queued`, `running→converting`, `succeeded→validating` (during
POST /validate + download) then `ready`, `failed→error`. The client-side
`uploading` state covers form submission. A 404 on a job we previously
reached terminates the run as `error` ("the service no longer knows this
job"). Server `logs` attach to the step implied by the status at receipt.
The existing `deriveSteps`/UI contract is untouched.

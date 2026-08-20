# Upstream gap tickets for exegia/corpora-py

Issue-ready — paste each into a GitHub issue as-is. Found while planning the
corpora-web integration (specs/004-connect-with-py); file:line references are
against corpora-py `main` as of 2026-08-20. None have been filed yet.

---

## Ticket 1 — feat(jobs): durable, listable, owner-scoped conversion jobs

**Problem.** The conversion job registry is an in-memory dict in one process
(`JobManager`, `packages/admin/src/admin/services/jobs.py:130-332`). On the
Vercel deployment this means:

- a poll can land on an instance that never saw the job and 404 mid-flight,
  even while the job is still running elsewhere;
- every redeploy/instance recycle forgets all jobs, while their `.corpus`
  results may still sit in `_RESULTS_ROOT`;
- there is no `GET /convert` (list) endpoint at all — clients must persist job
  ids themselves (the example app uses localStorage), so work is lost across
  devices or after a cache clear;
- nothing reaps `_RESULTS_ROOT` / `_HUB_CACHE_ROOT` — the existing TODO at
  `services/api.py:50-55` ("This still needs a TTL-based reap job").

**Impact on frontends.** corpora-web (Supabase-backed SPA) cannot offer
resume-after-reload, multi-device visibility, or a "recent conversions" view;
it must treat every mid-flight 404 as a terminal failure.

**Proposal.**
1. Pluggable job store behind `JobManager` (interface + default in-memory
   impl; a Postgres/Supabase or Redis impl for serverless deployments).
2. `GET /convert` returning the caller's jobs (owner = JWT `sub`, already
   captured at `jobs.py:88`; anonymous deployments may scope by nothing and
   cap the window).
3. TTL: reap terminal jobs + result files after a configurable retention.

**Acceptance.** A job created on one instance is pollable from another;
`GET /convert` lists it; a redeploy does not orphan results; disk usage is
bounded.

---

## Ticket 2 — feat(convert): corpus-detail endpoints for job results

**Problem.** `/storage/{filename}/manifest|index|content|nodes`
(`corpus_detail_api.py`) only serve archives published to the HF storage repo.
Production runs `hub_writable:false`, so a frontend that keeps its own corpus
registry (e.g. corpora-web with Supabase) has **no API access to the
manifest/toc/content of a conversion it just ran** — its only option is to
download the archive and unzip/parse `manifest.yml` + `toc.yml` in the
browser, duplicating server-side logic.

**Proposal.** Mirror the corpus-detail read endpoints against a job's
`result_path`:

- `GET /convert/{job_id}/manifest`
- `GET /convert/{job_id}/index`
- `GET /convert/{job_id}/content?ref=&fmt=&offset=&limit=`

(read-only; same response shapes as the storage-scoped variants; 409 unless
the job succeeded, 404 for unknown jobs — matching the download endpoint's
semantics at `services/api.py:273-281`.)

**Acceptance.** After a successful conversion, a client can fetch manifest,
index/toc, and paginated content by `job_id` without publishing to the Hub
and without client-side archive parsing.

---

## Ticket 3 — fix(api): typed job-status schema + documented transport caveats and limits

**Problem.**
1. `GET /convert/{job_id}` is `additionalProperties: true` in the OpenAPI
   (no `response_model`), so clients cannot codegen the job payload — even
   though the shape is stable (`ConversionJob.to_dict()`, `jobs.py:90-106`).
2. The WebSocket caveat is documented only in the repo's CLAUDE.md
   (:108-116): on Vercel, idle sockets are killed mid-job and **polling is
   what advances the frozen instance**. API consumers reading /docs will
   reasonably build WS-first clients that hang.
3. `413` (500 MiB cap, `api.py:67`) and `429` (queue full, `jobs.py:210-213`)
   are not declared in the OpenAPI responses.

**Proposal.** Add a Pydantic `ConversionJobStatus` response model; declare
413/422/429 on `POST /convert` and 404/409 on the job routes; put the
poll-vs-WS guidance and limits into the endpoint descriptions so they render
in /docs.

**Acceptance.** `openapi.json` fully types the job payload and error
responses; /docs states the transport guidance.

---

## Ticket 4 — fix(convert): `source_format=xml` is accepted by the enum but always 422s

**Problem.** `SourceFormat` includes `xml`
(`packages/admin/src/admin/parsers/schema.py:29-37`) but `CONVERTERS`
registers no `xml` entry (`packages/admin/src/admin/converters/__init__.py:23-31`),
so `source_format=xml` always fails with 422 *after* upload. The example
client silently maps `.xml → tei` (`example/app/lib/uploads/source-format.ts`),
which every other client must rediscover.

**Proposal.** Either (a) register an XML converter (alias to the TEI converter
if that is the intended semantics), or (b) remove `xml` from the enum and
document the `.xml → tei` client mapping in the /docs description of
`source_format`.

**Acceptance.** Sending each documented enum value with a matching file either
converts or is rejected up front with a clear message — no enum value is a
guaranteed post-upload 422.

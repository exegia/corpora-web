# Quickstart: developing against corpora-py

## Environment

Add to `.env` (and mirror in `.env.example`):

```bash
# Public — inlined into the bundle; the deployed conversion service.
VITE_CORPORA_API_URL=https://api.exegia.co
```

Omitting it defaults the client to `https://api.exegia.co`.

## Local backend (optional)

The sibling checkout `../corpora-py` runs the same app locally:

```bash
# uv-managed, single worker (the job registry is per-process — keep workers=1)
cd ../corpora-py && uv run uvicorn corpora_py.app:app --port 8000
```

Then `VITE_CORPORA_API_URL=http://127.0.0.1:8000`. The Docker compose path
(`docker-compose.yml` + Caddy) is the WS-capable deployment shape; irrelevant
to v1 (poll-only) but useful for upstream work.

Local capabilities differ from prod: `AUTH_REQUIRED` defaults **true** in
config — set `AUTH_REQUIRED=false` (and leave `HF_READ_ONLY` unset to allow
Hub writes only if `HF_TOKEN`/`HF_STORAGE_REPO` are configured).

## Smoke test (deployed service)

```bash
curl -s https://api.exegia.co/capabilities
```

```bash
curl -s -X POST https://api.exegia.co/convert -F file=@sample.tei -F source_format=tei -F name=sample
```

Then poll `GET /convert/{job_id}` every ~2 s until `succeeded`, and fetch
`GET /convert/{job_id}/download -o sample.corpus`. Remember: on this
deployment the poll *is* what advances the job.

## MCP (dev tooling — the SPA does not consume MCP)

Project-scoped config (`.mcp.json`, committed):

```json
{ "mcpServers": { "corpora": { "type": "http", "url": "https://api.exegia.co/mcp/" } } }
```

Or per-user:

```bash
claude mcp add --transport http corpora https://api.exegia.co/mcp/
```

Prod is read-only: expect the corpus/query/read tools only
(`list_corpora`, `search`, `get_passages`, `corpus_index`, …); the storage/
manifest write tools are not registered while `hub_writable:false`.

## Verifying the implementation (once built)

1. `bun run typecheck && bun run test` — all network mocked, no live calls.
2. Preview via launch tooling (seeded session per project memory): convert a
   small `.tei`/`.xml` file → drawer shows the service's real 3-line log
   sequence → new library row carries manifest-derived metadata + real commit
   history → detail Overview lists real sections (or the empty state).
3. Failure drills against the live service: unsupported extension (blocked
   pre-upload), oversized file (413 message), and a mocked mid-flight 404
   (route test) → each shows its specific message with Retry.

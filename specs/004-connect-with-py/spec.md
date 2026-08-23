# Feature Specification: Connect the corpus library to the real conversion service

**Feature Branch**: `chore/connect-with-py`
**Created**: 2026-08-20
**Status**: Draft
**Input**: User description: "Implement the backend connection (MCP, WebSocket and API) from corpora-py — replace the simulated conversion pipeline with the deployed service at api.exegia.co."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Convert a document for real (Priority: P1)

A researcher picks a source document (TEI/XML, EPUB, HTML, PDF, plain text, or a
Text-Fabric/TEI ZIP) on the Corpus page. The conversion runs on the real
conversion service; the status pill and drawer show the service's actual
statuses and log lines. When it finishes, the produced `.corpus` archive is
stored in the library with its authentic metadata (name, language, type,
description) and its real version history.

**Why this priority**: This is the feature's reason to exist — everything the
UI currently shows is fabricated; nothing a user converts today produces a real
corpus.

**Independent Test**: Convert a small TEI file end-to-end against the service;
the library row's metadata and version history match the archive's actual
manifest and nested git history, and the archived file downloaded from the
library opens as a valid `.corpus`.

**Acceptance Scenarios**:

1. **Given** a valid TEI file, **When** the user converts it, **Then** the
   drawer steps advance with the service's real status transitions and log
   lines, and a new library row appears carrying metadata read from the
   produced archive (not fabricated values).
2. **Given** a source document the service cannot convert, **When** conversion
   fails, **Then** the drawer marks the step it failed in with the service's
   error message, nothing is persisted, and Retry re-runs the conversion.
3. **Given** an unsupported file extension, **When** the user picks it, **Then**
   they are told which formats are supported before anything is uploaded.

### User Story 2 - Survive an unreliable service (Priority: P2)

The conversion service may be briefly unavailable, drop a job it had accepted
(instance recycling), or refuse new work when its queue is full. The user
always sees an honest state — never a spinner that spins forever — and can
retry.

**Why this priority**: The deployed service keeps jobs in memory per instance;
mid-flight loss is a normal condition, not an edge case. Trust in the library
depends on failures being visible and recoverable.

**Independent Test**: Simulate (mock) a job that the service forgets mid-poll;
the UI reports the loss and offers Retry, and retrying starts a fresh
conversion.

**Acceptance Scenarios**:

1. **Given** a conversion in flight, **When** the service stops recognizing the
   job, **Then** the drawer marks the run failed with an explanation and Retry
   starts over.
2. **Given** the service queue is full or the file exceeds the size limit,
   **When** the user submits, **Then** the specific reason is shown immediately.
3. **Given** the service is unreachable, **When** the user converts, **Then**
   the failure is visible within seconds and nothing is stored.

### User Story 3 - Real section data on the detail page (Priority: P3)

The corpus detail page's Overview shows the archive's actual table of contents
(sections with node/word counts) instead of fabricated rows; rows converted
before this feature show an honest "no section data" state.

**Why this priority**: Valuable but cosmetic relative to P1/P2; the page
functions without it.

**Independent Test**: Convert a document with known sections; the Overview rows
match the archive's table of contents.

**Acceptance Scenarios**:

1. **Given** a newly converted corpus, **When** its detail page opens, **Then**
   the Overview lists the archive's real sections.
2. **Given** a legacy row without section data, **When** its detail page opens,
   **Then** the Overview says no section data is available.

### Edge Cases

- Job succeeded but the archive download fails → run is marked failed before
  anything persists; Retry available.
- Validation reports the corpus invalid → the verdict is shown as an
  annotation; download/persist still proceeds (validation never gates).
- The service requires authentication in the future → requests carry the
  signed-in user's token automatically; unauthenticated failures surface as a
  clear "sign in" message.
- Duplicate conversion of the same file → allowed; each run produces its own
  library row (dedup is out of scope).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST submit conversions to the external conversion
  service and reflect its real job lifecycle (queued → running →
  succeeded/failed) in the existing pill/drawer UI.
- **FR-002**: The system MUST show the service's own log lines in the drawer.
- **FR-003**: The system MUST classify the source format from the picked file
  (including routing `.xml` as TEI) and reject unsupported types before upload.
- **FR-004**: On success the system MUST download the produced `.corpus`
  archive, store it in the library's file storage, and create a library row
  whose metadata (name, language, type, description, size, stats) and version
  history come from the archive and the service's validation report.
- **FR-005**: The system MUST track jobs by polling; it MUST NOT depend on a
  persistent socket connection (the deployment kills idle sockets, and polling
  is what advances the job).
- **FR-006**: Service errors (unavailable, queue full, file too large,
  unsupported format, job forgotten, download failed) MUST each surface a
  distinct, human-readable failure with Retry where meaningful.
- **FR-007**: Requests MUST carry the signed-in user's bearer token whenever a
  session exists, so enabling authentication on the service requires no client
  change.
- **FR-008**: The detail page's Overview MUST render section data captured at
  conversion time, with an explicit empty state for rows that have none.
- **FR-009**: The developer tooling MUST document and configure the service's
  MCP endpoint for agent use; the web application itself does not consume MCP.
- **FR-010**: All CI tests MUST run without the live service (mocked at the
  data-access seam).

### Non-Goals

- Publishing corpora to the service's Hub storage (deployment is read-only).
- The `/ingest` pipeline (disabled on the deployment).
- Consuming MCP from the browser.
- Resuming jobs across page reloads or devices (blocked on service-side job
  persistence; tracked as an upstream ticket).

## Success Criteria *(mandatory)*

- **SC-001**: A supported document converts end-to-end against the deployed
  service and lands in the library with authentic metadata and history.
- **SC-002**: Every failure mode in FR-006 produces a visible, specific message
  within one poll interval (~2 s) of detection.
- **SC-003**: Zero fabricated values remain in the success path (stats,
  sections, licence, language all come from the archive, the validation
  report, or are honestly absent).
- **SC-004**: `bun run typecheck`, `bun run lint`, `bun run test`, and
  `bun run build` pass with no live network access.

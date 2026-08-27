# Feature Specification: AI Assistant Panel for the Corpus Reader

**Feature Branch**: `005-ai-assistant-panel`
**Created**: 2026-08-27
**Status**: Draft
**Input**: Sketch design — document "corpora - claude", page "Corpus - ai chat", frames AI 1–AI 8 (selection menu, scoped panel, streaming, proposal diff, applied + provenance, node scopes, corpus command / read-only, inline-menu alternates). Design is the source of truth; each requirement below traces to a frame.

## Design Reference

| Frame | State shown |
|---|---|
| AI 1 - Selection menu | Entry point: selection → inline verb menu with scope line |
| AI 2 - Panel open scoped | Panel empty state: scope chip, suggested prompts, composer |
| AI 3 - Streaming answer | Streaming state; multi-paragraph range scope (`a.1 ¶1–¶2 · passage`) |
| AI 4 - Proposed edit diff | Proposal pending + stale proposal card |
| AI 5 - Applied and provenance | Applied to draft revision; provenance marks in reader and apparatus |
| AI 6 - Node scopes | Scope picker (word→corpus); thread pinned across quaestio navigation |
| AI 7 - Corpus command, read-only | Corpus-level scope; degraded read-only state |
| AI 8 - Inline menu alternates | Two unresolved entry-point alternates (verb-first vs single "Ask AI") |

## Clarifications

### Session 2026-08-27

- Q: Does the AI ever write directly to corpus text? → A: Never. Every edit is a proposal; Apply writes to a draft revision, which still passes peer review before publishing. Published corpora are read-only for the assistant.
- Q: What happens to an open thread when the user navigates to another quaestio? → A: The thread persists and stays pinned to its original passage; re-scoping is an explicit action that forks a new section within the same thread.
- Q: How is AI-authored content distinguished for citing scholars? → A: In-panel, generated text carries a visible "GENERATED · not part of the corpus" marker. Applied readings carry a reader-visible mark (underline + ◆ gutter glyph) and an apparatus record (`resp="#corpora-ai"` plus approving editor, displaced reading retained as variant) that survives TEI/citation export. This is a correctness requirement, not styling.
- Q: Which inline entry point ships? → A: Undecided by design (frame AI 8 shows both alternates). Decision owed before implementation of the inline menu; the panel is entry-point-agnostic.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ask a scoped question about a passage (Priority: P1)

A scholar selects a word or a multi-paragraph passage in the reader and asks the assistant about it. The panel opens scoped to exactly that selection (scope chip names the node and range), streams an answer marked as generated, and the answer cites paragraphs inside the scope.

**Why this priority**: Read-only Q&A is the backbone — it exercises scope, streaming, and generated-content marking without touching the write path, and is independently shippable.

**Independent Test**: Select ¶1–¶2 of Q.1 a.1, open the panel, ask a question; verify the chip reads "a.1 ¶1–¶2 · passage", the answer streams with the GENERATED marker, Stop halts it, and nothing in the corpus changed.

**Acceptance Scenarios**:

1. **Given** a text selection, **When** the user opens the AI panel (menu or ⌘J), **Then** the panel opens with a scope chip naming the smallest node containing the whole selection, including ranges (e.g. "a.1 ¶1–¶2 · passage").
2. **Given** an open scoped panel with no messages, **When** the user views it, **Then** suggested prompts derived from the scoped node are shown and nothing runs until the user sends (frame AI 2).
3. **Given** a sent question, **When** the answer streams, **Then** the streaming container is a polite live region announced in sentence batches, the composer is disabled, and Stop / ⎋ halts generation (frame AI 3).
4. **Given** a streamed answer, **When** it renders, **Then** it is visibly marked "GENERATED · NOT PART OF THE CORPUS" and paragraph citations link into the reader.
5. **Given** a selection crossing an articulus boundary, **When** the panel opens, **Then** the scope clamps to whole articuli and the chip reads e.g. "a.1–a.2 · 2 articuli".

---

### User Story 2 - Review and apply a proposed edit (Priority: P2)

The assistant proposes a change (e.g. correcting the morphological annotation of *doctrinam* from NOM to ACC) as a diff with a generated rationale. The scholar reviews, then applies to a draft revision or rejects. A proposal made against an outdated version is marked stale and cannot be applied.

**Why this priority**: The write path is the product's value beyond chat, but must land after the read path since it depends on scope + panel. It carries the reversibility guarantees.

**Independent Test**: Trigger an annotation proposal, verify the diff shows −/+ rows with ins/del semantics, Apply creates a change in a draft revision (published text untouched), Undo reverts it; edit the underlying paragraph in another session and verify the open proposal flips to stale with Apply disabled.

**Acceptance Scenarios**:

1. **Given** a proposal, **When** it renders, **Then** it shows old/new as diff rows carrying +/− glyphs and ins/del semantics (never color alone), the generated rationale is labeled as generated, and the target node is named (frame AI 4).
2. **Given** a pending proposal, **When** the user applies it (↩ on focused Apply, or ⌘↩ within the panel), **Then** the change is written to a draft revision — never to published text — and the panel confirms the revision number.
3. **Given** a pending proposal, **When** the user rejects it, **Then** nothing is written and the proposal is recorded as rejected in the thread.
4. **Given** the underlying text changed after a proposal was generated, **When** the user views it, **Then** it is marked STALE with the version delta, Apply is unavailable, and Re-generate is offered (frame AI 4).
5. **Given** an applied change, **When** the user invokes Undo (⌘Z or from the applied card), **Then** the draft revision no longer contains the change.

---

### User Story 3 - Provenance of AI-assisted readings (Priority: P2)

After an apply, the changed reading is visibly marked in the reader and recorded in the apparatus so a citing scholar can always distinguish transmitted source text from AI-assisted, editor-approved readings — in the app and in every export.

**Why this priority**: Correctness requirement for a scholarly corpus; ships with US2 (an apply without provenance must not exist).

**Independent Test**: Apply a proposal, verify the reading shows underline + ◆ in the reader with the provenance record (AI + approving editor + timestamp) inspectable; export TEI and verify `resp` attribution and the displaced reading as a variant.

**Acceptance Scenarios**:

1. **Given** an applied AI-assisted change, **When** the passage renders, **Then** the reading carries a persistent visual mark (underline + ◆ gutter glyph) distinct from user highlights (frame AI 5).
2. **Given** an applied change, **When** its provenance is inspected, **Then** it records AI proposal, approving editor, timestamp, and revision, and retains the displaced reading as a variant.
3. **Given** a TEI or citation export of a revision containing AI-assisted readings, **When** it is generated, **Then** the attribution (`resp="#corpora-ai"` + editor) and the variant reading are present in the export.
4. **Given** a rejected or undone proposal, **When** the passage renders, **Then** no provenance mark remains.

---

### User Story 4 - Scope model, thread pinning, and corpus-level commands (Priority: P3)

Scopes are corpus nodes (word → passage → articulus → quaestio → corpus). Threads stay pinned to their passage when the scholar navigates elsewhere; re-scoping is explicit and forks a section. Corpus-level commands work at corpus scope, and a published corpus degrades to answers-only.

**Independent Test**: Open a thread on Q.1 a.1 ¶1, navigate to Q.2 — verify the chip shows PINNED and answers still target Q.1; re-scope explicitly and verify a forked section. On a published corpus, issue a bulk command and verify the assistant answers with occurrences but refuses edits with a visible reason.

**Acceptance Scenarios**:

1. **Given** an open scope picker, **When** the user browses, **Then** exactly the node ladder word / passage / articulus / quaestio / corpus is offered, keyboard-operable as a listbox (frame AI 6).
2. **Given** an open thread and navigation to another quaestio, **Then** the thread persists, the chip shows PINNED with the original node, and it never silently re-scopes (frame AI 6).
3. **Given** a pinned thread, **When** the user re-scopes, **Then** a new, visibly forked section starts in the same thread and history is kept.
4. **Given** corpus scope on a published corpus, **When** the user requests a bulk edit, **Then** the assistant reports findings with citations but refuses to propose edits, stating the read-only reason and offering the draft-revision path (frame AI 7); edit verbs are disabled with a visible reason, never hidden.
5. **Given** the model/provider is unavailable, **Then** the panel degrades the same way: banner, disabled composer, retry — the reader remains fully usable.

---

### Edge Cases

- Selection spans a paragraph boundary → range chip (US1-1); crosses an articulus boundary → clamp to whole articuli (US1-5).
- Proposal against a superseded version → stale, never applicable (US2-4).
- Navigation with panel open → pinned, explicit fork (US4-2/3).
- Published / read-only corpus, or user lacks edit rights → answers-only degradation with visible reason (US4-4). Role check follows existing admin/superadmin permissions — the assistant can never exceed the signed-in user's rights.
- Corpus-wide or structure-wide write actions additionally require the explicit confirmation gate specified in #100.
- The existing word popover (lemma · POS · frequency · View details) is preserved unchanged; the AI entry point augments it and no floating AI button is added over the text column (frames AI 1, AI 8).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The reader MUST offer an AI entry from a text selection (context menu and ⌘J / ⌘.) without altering the existing word popover; keyboard path: menu is a focus trap, ↑↓/↩ operate, ⎋ returns focus to the intact selection.
- **FR-002**: The panel MUST always display the active scope as a chip naming node type and range; scope is the smallest node containing the whole selection, clamping cross-articulus selections to whole articuli.
- **FR-003**: Scope levels MUST be exactly: word, passage (¶-range), articulus, quaestio, corpus.
- **FR-004**: Answers MUST stay within scope plus its containing node, and cite paragraphs.
- **FR-005**: Streaming output MUST render in a polite live region (sentence-batched announcements), be stoppable (Stop / ⎋), and disable the composer while active.
- **FR-006**: All generated content in the panel MUST be persistently marked as generated and never rendered as corpus text.
- **FR-007**: The assistant MUST NOT write to corpus content directly. Edits exist only as proposals; Apply writes to a draft revision subject to the existing lifecycle (draft → review → approved → published).
- **FR-008**: Proposals MUST render as diffs with +/− glyphs and ins/del semantics, target-node identification, and a rationale labeled as generated.
- **FR-009**: Proposals MUST be version-bound: if the underlying text changes, the proposal becomes stale — Apply disabled, Re-generate offered.
- **FR-010**: Applied changes MUST be undoable while the draft revision is open.
- **FR-011**: Applied AI-assisted readings MUST carry (a) a reader-visible mark, (b) an apparatus record with AI + approving editor + timestamp + displaced reading as variant, and (c) that attribution in every export (TEI, citations).
- **FR-012**: Threads MUST persist across navigation, pinned to their originating node; re-scoping MUST be explicit and fork a new thread section with history retained.
- **FR-013**: On published corpora, for users without edit rights, or when the model is unavailable, the panel MUST degrade to answers-only (or fully disabled for model outage) with a visible reason; edit affordances are disabled with explanation, never hidden; the assistant MUST NOT exceed the signed-in user's permissions.
- **FR-014**: Corpus-scope write commands MUST pass the explicit confirmation gate of #100 in addition to the proposal flow.
- **FR-015**: Panel focus order: close → scope chip (⌫ removes) → add scope → suggestions → composer → mode → send; ⌘J opens with focus in the composer; ⎋ closes and returns focus to the last selection; after Apply, focus moves to the changed reading and the confirmation toast is an assertive live region.

### Key Entities

- **Thread**: A conversation bound to a corpus node (its pin). Contains sections (created by explicit re-scopes), messages, and proposals.
- **Scope**: A reference to a corpus node (word / passage / articulus / quaestio / corpus) plus optional ¶-range, snapshotted at a corpus version.
- **Proposal**: A version-bound suggested change (text or annotation) with diff, generated rationale, and state: pending → applied | rejected | stale.
- **Provenance record**: Apparatus entry linking an applied reading to `resp="#corpora-ai"`, the approving editor, timestamp, revision, and the displaced reading as variant.

## Success Criteria *(mandatory)*

- **SC-001**: From any selection, a scholar reaches a correctly scoped panel in one action; 100% of scope chips name the node and range accurately, including multi-paragraph and clamped cross-articulus selections.
- **SC-002**: 0 direct writes: no code path lets assistant output reach corpus content without proposal → apply-to-draft; 100% of stale proposals are blocked from apply.
- **SC-003**: 100% of applied AI-assisted readings carry reader mark + apparatus record, and the attribution survives TEI/citation export round-trips.
- **SC-004**: Full keyboard operability of menu, panel, picker, and apply flow; streaming and apply confirmations are announced via live regions.
- **SC-005**: On a published corpus the assistant answers but never proposes; degraded states always state their reason.

## Assumptions

- Draft revisions, versioning, and the peer-review lifecycle exist (Activity/version work, #80–#84) and are the substrate for apply/undo/stale detection.
- The inline entry-point choice (verb-first menu vs single "Ask AI" row — frame AI 8) is a design decision owed before US1's menu work; both alternates share the panel contract, so panel work is not blocked.
- Model/provider configuration arrives via the Profile AI tab (#54); this feature consumes whatever provider is configured and owns only its unavailable-state UX.
- Latin scholarly vocabulary (quaestio, articulus, ¶ numbering, apparatus, TEI export) matches the corpus schema already used by the reader.

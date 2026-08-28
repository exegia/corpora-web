# Feature Specification: AI Assistant Panel for the Corpus Reader

**Feature Branch**: `005-ai-assistant-panel`
**Created**: 2026-08-27 · **Revised**: 2026-08-28 (simplified to curation model)
**Status**: Draft
**Input**: Sketch design — document "corpora - claude", page "Corpus - ai chat", frames AI 1–AI 8. Design is the source of truth; each requirement traces to a frame.

## Purpose

This chat is a **curation tool**, not a research assistant. It exists so an editor can fix formatting, normalise references, and repair or update **text-fabric nodes** (boundaries, labels, features) so the corpus conforms to its expected schema. It is not for lexical/etymological study — the existing word popover (lemma · POS · frequency) already serves reading.

## Design Reference

| Frame | State shown |
|---|---|
| AI 1 - Add to chat entry | Selection popover with the single "Add to chat" action (⌘J) |
| AI 2 - Panel open scoped | Panel empty state: scope chip, curation prompts, composer |
| AI 3 - Streaming answer | Context-Fabric validation streaming; multi-¶ range scope |
| AI 4 - Suggested fix diff | Suggested fix pending + stale suggestion card |
| AI 5 - Applied and provenance | Applied — version history record, reader marks |
| AI 6 - Node scopes | Scope picker (word→corpus); thread pinned across navigation |
| AI 7 - Corpus command, read-only | Corpus scope; published corpus locked (degraded) |
| AI 8 - Inline menu alternates | RESOLVED: one "Add to chat" action for every selection type |

## Clarifications

### Session 2026-08-28 (supersedes 2026-08-27 where they conflict)

- Q: What is the entry point? → A: **Resolved.** Any selection — whole node, partial text, or a single word — shows its popover with one action: **"Add to chat"** (⌘J). Word selections keep the full lemma popover with the action appended; other selections get the same popover shell with a node summary (range · node ids · word count). No verb menu, no floating AI button.
- Q: What powers suggestions? → A: The agent is loaded with the **Context-Fabric MCP**: it validates the selected node(s) against the corpus schema and text-fabric structure (otype/oslots integrity, boundaries, labels, features — TF/RC rule checks) and suggests changes that make the node conform.
- Q: Do changes need approval/review? → A: **Not for now** (an approval flow will come later). Apply writes immediately to the working version. Every change MUST be recorded in version history (Activity) with author attribution and the previous value, and MUST be undoable.
- Q: Published corpora? → A: Still locked — the assistant answers but cannot change a published corpus; edits happen in a working draft.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add a selection to the chat and ask about it (Priority: P1)

An editor selects a word or a multi-paragraph passage in the reader, hits "Add to chat" on the popover, and the panel opens scoped to that selection. Answers stream, marked as generated, citing node ids and paragraphs.

**Independent Test**: Select ¶1–¶2 of Q.1 a.1 → Add to chat → chip reads "a.1 ¶1–¶2 · passage"; ask a question; answer streams with GENERATED marker; Stop halts; nothing in the corpus changed.

**Acceptance Scenarios**:

1. **Given** any selection (word, partial text, whole node), **When** the popover shows, **Then** it offers exactly one AI action, "Add to chat" (⌘J); word selections keep lemma · POS · frequency unchanged (frames AI 1, AI 8).
2. **Given** "Add to chat", **When** the panel opens, **Then** the scope chip names the smallest node containing the whole selection, including ¶-ranges; cross-articulus selections clamp to whole articuli.
3. **Given** a sent message, **When** the answer streams, **Then** the container is a polite live region (sentence batches), the composer is disabled, and Stop / ⎋ halts (frame AI 3).
4. **Given** any assistant output, **Then** it is marked "GENERATED · NOT PART OF THE CORPUS" and cites node ids / paragraphs.

---

### User Story 2 - Validate a node and apply a suggested fix (Priority: P1)

The editor asks the assistant to validate the selection. The Context-Fabric MCP checks the node against the schema (boundaries, labels, features) and reports findings with node ids. For a fixable finding, the assistant presents a suggested fix as a diff; Apply writes it immediately to the working version, recorded in version history and undoable.

**Independent Test**: Add a ¶-node with a missing word-feature to the chat → "Validate against the schema" → findings stream with node ids and rule codes → suggested fix renders as −/+ diff → Apply → reader shows the change with a mark, Activity shows the version-history entry, ⌘Z undoes it.

**Acceptance Scenarios**:

1. **Given** a scoped selection, **When** validation runs, **Then** findings name the node id, the rule (e.g. boundary drift, label mismatch, missing feature), and what the editor will observe — not just a code (frame AI 3).
2. **Given** a fixable finding, **When** the suggestion renders, **Then** it shows old/new as diff rows with +/− glyphs and ins/del semantics (never color alone), names the target node, and labels the rationale as generated (frame AI 4).
3. **Given** a suggested fix, **When** the editor applies it (↩ on Apply, or ⌘↩ in the panel), **Then** the change is written immediately to the working version — no approval step — and the panel confirms the version-history entry (frame AI 5).
4. **Given** an applied change, **When** the editor invokes Undo (⌘Z or the applied card), **Then** the change is reverted and the revert is itself recorded in version history.
5. **Given** the underlying node changed after a suggestion was generated, **Then** the suggestion is marked STALE with the version delta, Apply is unavailable, and Re-validate is offered (frame AI 4).

---

### User Story 3 - Version history and change tracking (Priority: P1)

With no approval gate, tracking carries the full weight: every applied change lands in version history with who (AI + applying user), what (node id, old → new value), and when — visible in Activity and in exports.

**Acceptance Scenarios**:

1. **Given** an applied change, **Then** version history records author `resp="#corpora-ai"` plus the applying user, the node id, the previous value, and the timestamp (frame AI 5).
2. **Given** an AI-assisted change, **When** the passage renders, **Then** the changed reading carries a persistent mark (underline + ◆ gutter glyph) distinct from user highlights.
3. **Given** a TEI or citation export, **Then** the attribution and previous value are carried — anyone citing the corpus can see which values changed, by whom, and what they were before.
4. **Given** an undone change, **Then** no mark remains and both the change and the revert appear in Activity.

---

### User Story 4 - Scope model, thread pinning, corpus commands, locked corpora (Priority: P2)

Scopes are corpus nodes (word → passage → articulus → quaestio → corpus). Threads stay pinned to their passage when the editor navigates; re-scoping is explicit and forks a section. Corpus-level commands work at corpus scope; published corpora are locked (answers only).

**Acceptance Scenarios**:

1. **Given** the scope picker, **Then** exactly the node ladder word / passage / articulus / quaestio / corpus is offered, keyboard-operable (frame AI 6).
2. **Given** an open thread and navigation to another quaestio, **Then** the thread persists, the chip shows PINNED, and it never silently re-scopes; explicit re-scope forks a section (frame AI 6).
3. **Given** corpus scope on a published corpus, **When** the editor requests a bulk change, **Then** the assistant reports findings with citations but cannot change the corpus — locked reason shown, working-draft path offered (frame AI 7). Edit affordances are disabled with a visible reason, never hidden.
4. **Given** the model/provider is unavailable, **Then** the panel degrades the same way (banner + disabled composer + retry); the reader remains fully usable.
5. **Given** a corpus-wide write command on a working draft, **Then** it passes the explicit confirmation gate of #100 before applying.

---

### Edge Cases

- Selection spans a ¶ boundary → range chip; crosses an articulus boundary → clamp to whole articuli.
- Suggestion against a superseded version → stale, never applicable; re-validate.
- Navigation with panel open → pinned, explicit fork.
- Published corpus / missing rights → answers-only with visible reason; the assistant never exceeds the signed-in user's permissions.
- Structural fixes beyond feature/label edits (slot-level corruption) are out of the panel's reach — validation says so plainly and points to a walker re-run rather than pretending a text edit fixes it.
- The word popover (lemma · POS · frequency · View details) is preserved unchanged; "Add to chat" is appended, nothing replaced (frames AI 1, AI 8).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every text selection (word, partial text, whole node) MUST show its popover with exactly one AI action, "Add to chat" (⌘J). Word selections keep the existing lemma popover content; other selections show a node summary (range, node ids, word count). No verb menu; no floating AI button over the text column.
- **FR-002**: The panel MUST always display the active scope as a chip naming node type and range; scope is the smallest node containing the whole selection, clamping cross-articulus selections to whole articuli.
- **FR-003**: Scope levels MUST be exactly: word, passage (¶-range), articulus, quaestio, corpus.
- **FR-004**: The agent MUST be loaded with the Context-Fabric MCP and use it to validate scoped nodes against the corpus schema and text-fabric structure; findings MUST name node ids and the observable consequence, and suggestions MUST make the node conform to the expected schema.
- **FR-005**: Streaming output MUST render in a polite live region (sentence-batched), be stoppable (Stop / ⎋), and disable the composer while active.
- **FR-006**: All generated content MUST be persistently marked as generated and never rendered as corpus text.
- **FR-007**: Suggested fixes MUST render as diffs with +/− glyphs and ins/del semantics, target-node identification, and a generated-labeled rationale.
- **FR-008**: Apply MUST write the change immediately to the working version — no approval or review step (a review flow is planned later and MUST NOT be assumed by this feature's data model to be impossible).
- **FR-009**: Every applied change MUST be recorded in version history with author attribution (`resp="#corpora-ai"` + applying user), node id, previous value, and timestamp — and MUST be undoable, with the revert also recorded.
- **FR-010**: Suggestions MUST be version-bound: if the underlying node changes, the suggestion becomes stale — Apply disabled, Re-validate offered.
- **FR-011**: AI-assisted changes MUST carry a reader-visible mark (underline + ◆), and exports (TEI, citations) MUST carry the attribution and previous value.
- **FR-012**: Threads MUST persist across navigation, pinned to their originating node; re-scoping MUST be explicit and fork a new thread section with history retained.
- **FR-013**: Published corpora are locked: the panel degrades to answers-only with a visible reason; the same degradation pattern applies to missing rights and model unavailability. Edit affordances are disabled with explanation, never hidden.
- **FR-014**: Corpus-scope write commands on a working draft MUST pass the explicit confirmation gate of #100.
- **FR-015**: Keyboard/focus: ⌘J adds the selection to the chat and focuses the composer; ⎋ closes/halts and returns focus to the selection; panel focus order close → scope chip (⌫ removes) → add scope → prompts → composer → send; after Apply, focus moves to the changed reading and the toast is an assertive live region.

### Key Entities

- **Thread**: A conversation bound to a corpus node (its pin), with sections (explicit re-scopes), messages, and suggestions.
- **Scope**: A corpus-node reference (word / passage / articulus / quaestio / corpus) plus optional ¶-range, snapshotted at a version.
- **Suggestion**: A version-bound suggested change (feature, label, boundary, formatting, reference) with diff and generated rationale; state: pending → applied | rejected | stale.
- **Version-history entry**: Change-log record — AI + applying user, node id, old → new value, timestamp; the substrate for undo, Activity display, and export attribution.

## Success Criteria *(mandatory)*

- **SC-001**: From any selection, one action reaches a correctly scoped chat; 100% of scope chips name node and range accurately.
- **SC-002**: 100% of applied changes appear in version history with attribution and previous value, and are undoable; 100% of stale suggestions are blocked from apply.
- **SC-003**: Validation findings always name the node id and observable consequence; suggestions conform to the schema they cite.
- **SC-004**: Full keyboard operability; streaming and apply confirmations announced via live regions.
- **SC-005**: On a published corpus the assistant answers but never writes; degraded states always state their reason.

## Assumptions

- Version history / Activity (#80–#84) is the substrate for tracking, undo, and staleness.
- The Context-Fabric MCP exposes the corpus schema + TF/RC validation (as in the org's text-fabric validator: otype/oslots integrity, boundary drift, label mismatch, missing features); slot-level rebuilds stay with the walker and are out of scope.
- Approval/review is deliberately deferred; when it arrives it layers onto the same version-history records without migration.
- Provider/model configuration arrives via the Profile AI tab (#54).

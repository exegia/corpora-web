# Implementation Plan: AI Assistant Panel for the Corpus Reader

**Spec**: `specs/005-ai-assistant-panel/spec.md` (revised 2026-08-28 — curation model)
**Design**: Sketch "corpora - claude" · page "Corpus - ai chat" · frames AI 1–AI 8

## Approach

Curation tool, not research chat. Read path and write path are both P1 because the write path is now small: no approval flow — Apply writes to the working version and version history does the accounting. The panel is a full-height right rail; thread state lives outside the route so it survives navigation.

## Phases

### Phase 1 — Add to chat + scoped panel
- Popover: append the single "Add to chat" action (⌘J) to every selection popover; node-summary popover for non-word selections. Lemma popover untouched.
- Scope resolver (word/passage/articulus/quaestio/corpus; ¶-ranges; articulus clamping).
- Panel shell: scope chip, curation prompts, composer, keyboard/focus contract; streaming with live region + Stop.

### Phase 2 — Context-Fabric validation + apply
- Wire the Context-Fabric MCP: validate scoped nodes (boundaries, labels, features); findings with node ids + observable consequences.
- Suggested-fix cards (diff, generated rationale); Apply → immediate write to working version; Undo; version-bound staleness with content-hash guard.
- Version-history entries: AI + applying user, node id, previous value; reader marks (underline + ◆); export attribution.

### Phase 3 — Scope model + degradation
- Scope picker listbox; thread pinning; explicit re-scope forking.
- Corpus-scope commands through the #100 confirmation gate (working drafts only).
- Degraded states: published/locked, missing rights, model unavailable.

## Risks

- **No approval gate means tracking is the only safety net** — version-history write must be transactional with the change itself; a change that isn't recorded must not land.
- **Validation scope**: the panel can fix features/labels/formatting; slot-level corruption needs a walker re-run — the assistant must say so, not fake a fix.
- **Staleness** depends on version signals (#80–#84); guard with content-hash at apply.
- **A11y**: live regions for streaming and apply; test with VoiceOver in Phase 1.

## Dependencies

- Version history / Activity (#80, #83, #84) — substrate for tracking, undo, stale.
- Context-Fabric MCP (schema + TF/RC validation) — the suggestion engine.
- #100 — confirmation gate for corpus-wide writes.
- #54 — provider configuration (consumed).

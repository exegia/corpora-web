# Implementation Plan: AI Assistant Panel for the Corpus Reader

**Spec**: `specs/005-ai-assistant-panel/spec.md`
**Design**: Sketch "corpora - claude" · page "Corpus - ai chat" · frames AI 1–AI 8

## Approach

Ship the read path first, then the write path, then hardening — each phase independently releasable, mapping to the spec's prioritized user stories. The panel is a right-hand column of the corpus Documents route (reader shrinks from full width, per frames AI 2–AI 7); state lives outside the route so threads survive navigation (FR-012).

## Phases

### Phase 1 — Scoped ask (US1) · read-only
- Selection → scope resolution (word/passage/articulus/quaestio/corpus; range clamping).
- Panel shell: scope chip, suggested prompts, composer, keyboard/focus contract (FR-015).
- Streaming answers: live region, stop, generated marker, paragraph citations.
- Entry point behind a temporary "Open AI panel ⌘J" affordance until the AI 8 alternate decision lands.

### Phase 2 — Proposals (US2 + US3) · write path
- Proposal cards with diff rendering (annotation diffs first — smallest surface; text diffs second).
- Apply → draft revision integration; Undo; version-bound staleness (subscribe to revision changes).
- Provenance: reader marks (underline + ◆), apparatus record, TEI/citation export attribution. **Apply and provenance ship together — an apply without provenance must not exist.**

### Phase 3 — Scope model + degradation (US4)
- Scope picker listbox; thread pinning across navigation; explicit re-scope forking.
- Corpus-scope commands routed through the #100 confirmation gate.
- Degraded states: published/read-only, insufficient rights, model unavailable.

### Phase 4 — Entry-point decision + polish
- Resolve AI 8 alternates (verb-first vs single "Ask AI" row) with a usability pass; wire the winner into the word popover without regressing lemma/POS/frequency.

## Risks

- **Provenance-in-export is the correctness core**: if TEI/citation export cannot carry `resp` + variants yet, Phase 2 must extend the exporter first — do not ship apply without it.
- **Staleness detection** depends on reliable version signals from the Activity/versions work (#80–#84); if change records lag, proposals could apply against moved text. Mitigate with content-hash check at apply time.
- **Scope clamping** needs the reader's node addressing (quaestio/articulus/¶ ids) to be stable across revisions.
- **A11y**: streaming + live regions are easy to get wrong; test with VoiceOver early in Phase 1, not at the end.

## Dependencies

- Versioning / draft revisions / Activity (#80, #83, #84) — substrate for apply, undo, stale.
- #100 — confirmation gate for corpus-wide writes (Phase 3).
- #54 — Profile AI tab for provider configuration (consumed, not owned).
- Auth/roles from `corpora-auth` for the rights-based degradation (falls back to read-only-for-all until roles land).

# Reader AI entry point

The first slice of #108 connects the live reader to corpora-ui's
`SelectionPopover` and `AiPanel`. Clicking a word preserves its existing details
and opens selection actions. Dragging text or extending a keyboard selection
creates a passage context. “Add to chat” or Cmd/Ctrl+J opens the shell's right
rail. Escape closes the rail and restores focus to the source when it is still
mounted, otherwise to the current reader.

## Scope of this slice

- Explicit API token ids produce word scopes. Text-only passages retain passage
  scope: splitting visible text does not establish a reliable slot id.
- Multi-paragraph selections carry the actual passage ids, selected text, and
  visible paragraph range. Gutter numbers are excluded.
- Chat state lives in a Jotai atom owned by the signed-in app layout. It survives
  reader/question navigation, stays pinned, and retains prior contexts when a
  different selection is explicitly added. Logout/unmount discards it. It is not
  persisted across a reload.
- The composer is disabled with a visible unavailable reason. There are no
  synthetic responses, AI network calls, validation requests, or corpus writes.

The remaining #108 work includes live chat/streaming and cancellation,
version-bound scopes, the full scope ladder and cross-articulus clamping,
provider availability, validation, guarded apply/undo, and provenance/export
integration. These depend on the corpora-py #214 contract and subsequent slices;
this entry point does not complete spec 005.

## Component integration

`app/components/corpus/chat` owns context resolution, session state, and the
rail host. The shell stores a React element, so the host reads live atom state
rather than retaining props captured when the rail opened. The existing
conversion panel can still replace the right rail without losing chat context.

The published corpora-ui 2.0.0 `AiPanel` declares a scope prop but does not render
a scope chip. Its built-in header also has an unlabelled new-thread button.
The app renders a visible scope and accessible host header, hiding the built-in
header until upstream exposes the necessary controls. Do not assume declared
scope props alone create visible scope UI.

Tests cover real popover/panel rendering, Cmd/Ctrl+J, Escape/focus return, word
metadata, multi-paragraph range extraction, node ids, unavailable state, and
context pinning/history. Existing route tests continue to cover word inspection.

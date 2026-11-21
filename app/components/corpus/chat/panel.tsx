import { useEffect, useRef } from "react"
import { AiPanel } from "@exegia/corpora-ui"
import { Button } from "@/components/ui/button"
import { useAppShellPanels } from "@/components/layouts/shell-panels"
import { useChatState } from "./state"

export default function ChatPanel({ returnFocus }: { returnFocus: () => void }) {
    const [state, setState] = useChatState()
    const shell = useAppShellPanels()
    const closeRef = useRef<HTMLButtonElement>(null)
    const section = state.sections[state.active]
    useEffect(() => {
        closeRef.current?.focus()
    }, [state.active])
    if (!section) return null
    const pinned = state.location?.corpusId !== section.corpusId || state.location.ref !== section.location
    function close() {
        shell.setOpen(false, "right")
        returnFocus()
    }
    return (
        <div
            className="flex h-full min-h-0 flex-col"
            onKeyDown={event => {
                if (event.key === "Escape") {
                    event.preventDefault()
                    event.stopPropagation()
                    close()
                }
            }}>
            <header className="flex items-center justify-between gap-2 border-b px-4 py-2">
                <h2 className="text-sm font-semibold">Corpus curation</h2>
                <Button ref={closeRef} onClick={close} variant="ghost" size="sm">
                    Close AI panel
                </Button>
            </header>
            <AiPanel
                headerTitle="Corpus curation"
                // 2.0 renders scope props on the aside, rather than a visible chip.
                // The host owns the visible context until the component supports it.
                scope={section.scope}
                // The host header supplies close/focus behavior. Hide 2.0's built-in
                // header, which includes an unlabelled new-thread button.
                className="min-h-0 flex-1 [&_header]:hidden"
                thread={
                    <div className="space-y-4 py-4">
                        <p role="group" aria-label="Chat scope" className="rounded-md border px-3 py-2 text-sm">
                            {section.scope.label} · {section.scope.kind}
                            {pinned && <span className="ml-2 text-xs font-semibold">PINNED</span>}
                        </p>
                        {section.scope.kind === "word" && (
                            <p className="text-xs text-muted-foreground">
                                {section.location} {section.scope.range}
                            </p>
                        )}
                        {section.scope.nodeIds?.length ? (
                            <p className="text-xs text-muted-foreground">Nodes: {section.scope.nodeIds.join(", ")}</p>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                Node identifiers are unavailable for this passage.
                            </p>
                        )}
                        <blockquote className="border-l-2 pl-3 text-sm select-text">{section.text}</blockquote>
                        {state.sections.length > 1 && (
                            <nav aria-label="Previous chat contexts" className="flex flex-wrap gap-2">
                                {state.sections.map((entry, index) => (
                                    <Button
                                        key={index}
                                        variant="outline"
                                        size="sm"
                                        aria-current={index === state.active ? "true" : undefined}
                                        onClick={() => setState(previous => ({ ...previous, active: index }))}>
                                        {index + 1}. {entry.scope.label}
                                    </Button>
                                ))}
                            </nav>
                        )}
                        <p role="status" className="rounded-md border bg-muted p-3 text-sm">
                            AI curation is not available yet. You can keep reading; your selection will stay here while
                            you browse.
                        </p>
                    </div>
                }
                composerProps={{
                    disabled: true,
                    dictation: false,
                    placeholder: "AI curation is unavailable",
                    safetyNote: "No changes have been made to the corpus.",
                }}
            />
        </div>
    )
}

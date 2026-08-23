import { createContext, useContext } from "react"
import type { ShellPanelControls } from "@exegia/corpora-ui"

/**
 * The layout's one `useShellPanels()` instance, shared down the tree.
 *
 * `useShellPanels` holds panel state locally — calling it again in a header
 * button creates a second, disconnected instance whose `openPanel` never
 * reaches the shell. Anything under AppLayout that wants to drive the shell
 * (open the right panel with a component, toggle a side) must reach the
 * instance whose `providerProps` are spread on `Layout.Main`, via this
 * context.
 */
export const ShellPanelsContext = createContext<ShellPanelControls | null>(null)

/** The shell controls of the enclosing AppLayout. */
export function useAppShellPanels(): ShellPanelControls {
    const controls = useContext(ShellPanelsContext)
    if (!controls) {
        throw new Error("useAppShellPanels must be called under AppLayout")
    }
    return controls
}

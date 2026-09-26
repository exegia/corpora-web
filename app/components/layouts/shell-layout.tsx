import { useShellPanels } from "@exegia/corpora-ui"

/** All protected routes address the same library-owned Jotai panel atoms. */
export const APP_SHELL_ID = "corpora-app"

export function useAppShellPanels() {
    return useShellPanels({ shellId: APP_SHELL_ID })
}

import { createElement, isValidElement } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { useAppShellPanels } from "@/components/layouts/shell-layout"
import PanelHost from "./panel-host"
import { CONVERSION_PANEL_WIDTH } from "./utils"
import {
    conversionDocumentIdAtom,
    conversionEntryAtom,
    conversionRunningAtom,
    dismissConversionAtom,
    retryConversionAtom,
    startConversionAtom,
} from "./store"

/** Read shared state and dispatch actions; persistence belongs to ConversionRuntime. */
export function useConversion() {
    const entry = useAtomValue(conversionEntryAtom)
    const documentId = useAtomValue(conversionDocumentIdAtom)
    const running = useAtomValue(conversionRunningAtom)
    const dismiss = useSetAtom(dismissConversionAtom)
    const start = useSetAtom(startConversionAtom)
    const retry = useSetAtom(retryConversionAtom)
    const shell = useAppShellPanels()

    return {
        entry,
        documentId,
        running,
        start: (file: File) => {
            void start(file)
        },
        retry: () => {
            void retry()
        },
        openPanel: () => {
            shell.resizePanel(CONVERSION_PANEL_WIDTH)
            shell.openPanel("right", createElement(PanelHost))
        },
        dismiss: () => {
            dismiss()
            const panel = shell.providerProps.panelComponents?.right
            if (isValidElement(panel) && panel.type === PanelHost) {
                shell.setOpen(false, "right")
                shell.setOpenMobile(false, "right")
            }
        },
    }
}

export type ConversionController = ReturnType<typeof useConversion>

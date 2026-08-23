import { RefreshCw, SidebarOpen, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toastManager } from "@/components/ui/toast"
import { useFileUpload } from "@/hooks/use-file-upload"
import { SUPPORTED_EXTENSIONS } from "@/lib/corpora-api"
import type { ActionsProps } from "./types"
import { useCorpusUpload } from "./use-corpus-upload"
import { useCallback } from "react"
import { useAppShellPanels } from "@/components/layouts/shell-panels"

/**
 * The header's Convert / Upload pair: pick a source file to convert through
 * the pipeline, or store a ready-made .corpus directly. Lives in the app
 * layout header so a run stays reachable from every route.
 */
export default function Actions({ conversion }: ActionsProps) {
    const upload = useCorpusUpload()
    const [, convertPicker] = useFileUpload({
        accept: SUPPORTED_EXTENSIONS.join(","),
        onFilesAdded: added => {
            const file = added[0]?.file
            if (file instanceof File) conversion.start(file)
        },
        onError: errors => {
            if (errors[0]) {
                toastManager.add({ title: "Convert failed", description: errors[0] })
            }
        },
    })

    // The layout's shell instance — a local `useShellPanels()` here would be
    // a second, disconnected one whose `openPanel` never reaches the shell.
    const { openPanel } = useAppShellPanels()
    const handleOnOpenClick = useCallback(
        () =>
            openPanel(
                "right",
                <div className="p-4 text-sm text-muted-foreground">
                    Opened through <code>openPanel</code> — any component passed here replaces the panel's content.
                </div>,
            ),
        [openPanel],
    )

    return (
        <>
            {/* Dev-only: toggles the shell's right panel without running a conversion. */}
            {import.meta.env.DEV && (
                <Button
                    className="text-blue-600 hover:bg-blue-500/10 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    onClick={handleOnOpenClick}
                    type="button"
                    variant="ghost">
                    <SidebarOpen /> Open
                </Button>
            )}
            <input
                {...convertPicker.getInputProps({
                    "aria-label": "Convert source file",
                })}
                className="sr-only"
            />
            <Button disabled={conversion.running} onClick={convertPicker.openFileDialog} variant="outline">
                <RefreshCw /> Convert
            </Button>
            <input
                accept=".corpus"
                aria-label="Upload .corpus file"
                className="sr-only"
                onChange={event => {
                    const file = event.currentTarget.files?.[0]
                    if (file) void upload.handleFile(file)
                }}
                ref={upload.inputRef}
                type="file"
            />
            <Button disabled={upload.busy} onClick={upload.pick} type="button">
                <Upload /> {upload.uploading ? "Uploading…" : "Upload"}
            </Button>
        </>
    )
}

import { useEffect, useMemo, useRef } from "react"
import { CorpusChat } from "@/components/corpus/chat"
import { Outlet } from "react-router"
import type { SessionUser } from "@/lib/auth"
import { useUISounds } from "@/lib/sounds"
import { Breadcrumb } from "../breadcrumb"
import { Layout, useShellPanels, type TPanelMap } from "@exegia/corpora-ui"
import { Blocks } from "@/components/blocks"
import { Convert } from "@/components/corpus/convert"
import { ConversionContext } from "@/components/corpus/convert/conversion-context"
import { useConversion } from "@/components/corpus/convert/use-conversion"
import { CONVERSION_PANEL_WIDTH } from "@/components/corpus/convert/utils"
import { Sidebar } from "@/components/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ShellPanelsContext } from "./shell-panels"

export function AppLayout({ user }: { user?: SessionUser }) {
    useUISounds()

    // Conversion state lives on the layout so the header pill, the shell's
    // right panel, and the Convert/Upload actions survive route changes. It
    // is scoped to the signed-in user, so it does not survive a sign-out.
    const conversion = useConversion(user?.id ?? null)
    const shell = useShellPanels()
    const { openPanel, setOpen, open, providerProps, resizePanel } = shell

    // The controller and the shell each hold an open flag: `panelOpen` is what
    // the workflow asked for, `open.right` is what the shell shows (its own
    // trigger and `openPanel` callers also move it). Sync on edges, not
    // values, so neither side overwrites a change the other just made.
    const requestedRef = useRef(conversion.panelOpen)
    // Whose content the right panel holds. Only the conversion's own close may
    // close the shell; once something else took the panel over, it is theirs.
    const rightOwnerRef = useRef<"conversion" | "other">("other")
    useEffect(() => {
        const was = requestedRef.current
        requestedRef.current = conversion.panelOpen
        if (conversion.panelOpen && !was) {
            rightOwnerRef.current = "conversion"
            resizePanel(CONVERSION_PANEL_WIDTH)
            openPanel("right", <Convert.PanelHost />)
        } else if (!conversion.panelOpen && was && rightOwnerRef.current === "conversion") setOpen(false, "right")
    }, [conversion.panelOpen, openPanel, resizePanel, setOpen])

    // What the tree below gets as the shell. Anyone else opening the right
    // panel (Add to chat, the details editor) replaces the conversion's
    // content, so the controller stands down — its next `openPanel()` is then
    // a false-to-true edge again and Show progress takes the panel back.
    const { closePanel } = conversion
    const panelControls = useMemo<typeof shell>(
        () => ({
            ...shell,
            openPanel: (...args: Parameters<typeof openPanel>) => {
                if (args[0] === "right") {
                    rightOwnerRef.current = "other"
                    closePanel()
                }
                return openPanel(...args)
            },
        }),
        [shell, openPanel, closePanel]
    )

    // The way back: the shell's own trigger closed the panel, so the
    // controller must stand down too or its next `openPanel()` is a no-op.
    useEffect(() => {
        if (!open.right && conversion.panelOpen) conversion.closePanel()
    }, [open.right])

    const renderHeader = () => (
        <>
            <div className="flex flex-1">
                <Breadcrumb.Trail />
            </div>
            {/* Account actions live on the sidebar's profile card, not here. */}
            <div className="flex items-center gap-1">
                <Blocks.Sound />
                <Blocks.Theme />
            </div>
        </>
    )

    const renderSidebar = () => (
        <Sidebar.Navigation header={<Sidebar.Header />} footer={<Sidebar.Profile user={user} />} />
    )

    const panels: TPanelMap = {
        left: {
            id: "sidebar",
            name: "sidebar",
            component: renderSidebar(),
            open: true,
            side: "left",
        },
    }

    return (
        <ShellPanelsContext.Provider value={panelControls}>
            <CorpusChat.Provider>
            <ConversionContext.Provider value={conversion}>
                <Layout.Main {...providerProps} className="pt-2!" variant="web" header={renderHeader()} panels={panels}>
                    <ScrollArea className="route-scroll min-h-0 flex-1" fill>
                        <main className="p-6">
                            {/* Routes reach the conversion controller (pill + actions
                                in their own headers) through the outlet context. */}
                            <Outlet context={conversion} />
                        </main>
                    </ScrollArea>
                </Layout.Main>
            </ConversionContext.Provider>
            </CorpusChat.Provider>
        </ShellPanelsContext.Provider>
    )
}

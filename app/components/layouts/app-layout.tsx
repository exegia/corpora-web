import { useEffect, useRef } from "react"
import { Outlet } from "react-router"
import type { SessionUser } from "@/lib/auth"
import { useUISounds } from "@/lib/sounds"
import { Breadcrumb } from "../breadcrumb"
import { Layout, useShellPanels, type TPanelMap } from "@exegia/corpora-ui"
import { Blocks } from "@/components/blocks"
import { Convert } from "@/components/corpus/convert"
import { ConversionContext } from "@/components/corpus/convert/conversion-context"
import { useConversion } from "@/components/corpus/convert/use-conversion"
import { Sidebar } from "@/components/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ShellPanelsContext } from "./shell-panels"

export function AppLayout({ user }: { user?: SessionUser }) {
    useUISounds()

    // Conversion state lives on the layout so the header pill, the shell's
    // right panel, and the Convert/Upload actions survive route changes.
    const conversion = useConversion()
    const shell = useShellPanels()
    const { openPanel, setOpen, open, providerProps } = shell

    // The controller and the shell each hold an open flag: `panelOpen` is what
    // the workflow asked for, `open.right` is what the shell shows (its own
    // trigger and `openPanel` callers also move it). Sync on edges, not
    // values, so neither side overwrites a change the other just made.
    const requestedRef = useRef(conversion.panelOpen)
    useEffect(() => {
        const was = requestedRef.current
        requestedRef.current = conversion.panelOpen
        if (conversion.panelOpen && !was) openPanel("right", <Convert.PanelHost />)
        else if (!conversion.panelOpen && was) setOpen(false, "right")
    }, [conversion.panelOpen, openPanel, setOpen])

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
        <ShellPanelsContext.Provider value={shell}>
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
        </ShellPanelsContext.Provider>
    )
}

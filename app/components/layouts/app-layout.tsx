import { Outlet } from "react-router"
//import { Sidebar } from "@/components/sidebar"
import type { SessionUser } from "@/lib/auth"
import { useUISounds } from "@/lib/sounds"
import { Breadcrumb } from "../breadcrumb"
import { Layout, type TPanelMap } from "@exegia/corpora-ui"
import { Blocks } from "@/components/blocks"
import { Convert } from "@/components/corpus/convert"
import { useConversion } from "@/components/corpus/convert/use-conversion"
import { Sidebar } from "@/components/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"

export function AppLayout({ user }: { user?: SessionUser }) {
    useUISounds()

    // Conversion state lives on the layout so the header pill, the shell's
    // right panel, and the Convert/Upload actions survive route changes.
    const conversion = useConversion()

    const renderHeader = () => (
        <>
            <Breadcrumb.Trail />
            {/* Account actions live on the sidebar's profile card, not here. */}
            <div className="flex flex-1  items-center gap-1">
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
        ...(conversion.entry && {
            right: {
                id: "conversion",
                name: "Conversion",
                component: (
                    <Convert.Panel
                        documentId={conversion.documentId}
                        entry={conversion.entry}
                        onClose={conversion.closePanel}
                        onDismiss={conversion.dismiss}
                        onRetry={conversion.retry}
                    />
                ),
                open: conversion.panelOpen,
                side: "right" as const,
            },
        }),
    }

    return (
        <Layout.Main
            className="pt-2!"
            variant="web"
            header={renderHeader()}
            panels={panels}
            open={{ right: conversion.entry !== null && conversion.panelOpen }}
            onOpenChange={(open, side) => {
                if (side !== "right") return
                if (open) conversion.openPanel()
                else conversion.closePanel()
            }}>
            <ScrollArea className="route-scroll min-h-0 flex-1" fill>
                <main className="p-6">
                    {/* Routes reach the conversion controller (pill + actions
                        in their own headers) through the outlet context. */}
                    <Outlet context={conversion} />
                </main>
            </ScrollArea>
        </Layout.Main>
    )
}

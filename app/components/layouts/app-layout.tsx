import { Outlet } from "react-router"
//import { Sidebar } from "@/components/sidebar"
import type { SessionUser } from "@/lib/auth"
import { useUISounds } from "@/lib/sounds"
import { Breadcrumb } from "../breadcrumb"
import { Layout, type TPanelMap } from "@exegia/corpora-ui"
import { Blocks } from "@/components/blocks"
import { Sidebar } from "@/components/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"

export function AppLayout({ user }: { user?: SessionUser }) {
    useUISounds()

    const renderHeader = () => (
        <>
            <Breadcrumb.Trail />
            {/* Account actions live on the sidebar's profile card, not here. */}
            <div className="ml-auto flex items-center gap-1">
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
        <Layout.Main variant="desktop" header={renderHeader()} panels={panels}>
            <ScrollArea className="route-scroll min-h-0 flex-1" fill>
                <main className="p-6">
                    <Outlet />
                </main>
            </ScrollArea>
        </Layout.Main>
    )
}

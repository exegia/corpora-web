import { Outlet } from "react-router"
import type { SessionUser } from "@/lib/auth"
import { Breadcrumb } from "../breadcrumb"
import { Layout, type TPanelMap } from "@exegia/corpora-ui"
import { Blocks } from "@/components/blocks"
import { Sidebar } from "@/components/sidebar"
import { ScrollArea } from "@exegia/corpora-ui/ui/scroll-area"
import { useAppShellPanels } from "./shell-layout"

export function AppLayout({ user }: { user?: SessionUser }) {
    const { providerProps } = useAppShellPanels()

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
        <Layout.Main
            {...providerProps}
            className="pt-2!"
            variant="web"
            header={renderHeader()}
            panels={panels}>
            <ScrollArea className="route-scroll min-h-0 flex-1" fill>
                <main className="p-6">
                    <Outlet />
                </main>
            </ScrollArea>
        </Layout.Main>
    )
}

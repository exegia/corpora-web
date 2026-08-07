import { Outlet } from "react-router"
import { Sidebar } from "@/components/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { SessionUser } from "@/lib/auth"
import { useUISounds } from "@/lib/sounds"
import { Breadcrumb } from "./breadcrumb"
import { SoundToggle } from "./sound-toggle"
import { ThemeToggle } from "./theme-toggle"


export function AppLayout({ user }: { user?: SessionUser }) {
  useUISounds()

  return (
    <Sidebar.Provider className="p-2 h-screen">
      <Sidebar.Drawer user={user} />
      <Sidebar.Wrapper className="relative shadow-2xl border">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <Sidebar.Trigger />
          <Breadcrumb.Trail />
          {/* Account actions live on the sidebar's profile card, not here. */}
          <div className="ml-auto flex items-center gap-1">
            <SoundToggle />
            <ThemeToggle />
          </div>
        </header>

        {/* route-scroll: scopes the view-transition-name to this viewport so the
            snapshot is bounded by the visible region (see app.css). */}
        <ScrollArea className="flex-1 min-h-0 route-scroll" fill>
          <main className="p-6">
            <Outlet />
          </main>
          </ScrollArea>
      </Sidebar.Wrapper>
    </Sidebar.Provider>
  )
}

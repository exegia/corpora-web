import { Outlet } from "react-router"
import { Provider, Drawer, Wrapper, Trigger } from "@/components/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { SessionUser } from "@/lib/auth"
import { useUISounds } from "@/lib/sounds"
import { COBreadcrumb } from "./breadcrumb"
import { SoundToggle } from "./sound-toggle"
import { ThemeToggle } from "./theme-toggle"


export function AppLayout({ user }: { user?: SessionUser }) {
  useUISounds()

  return (
    <Provider className="p-2 h-screen">
      <Drawer user={user} />
      <Wrapper className="relative shadow-2xl border">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <Trigger />
          <COBreadcrumb />
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
      </Wrapper>
    </Provider>
  )
}

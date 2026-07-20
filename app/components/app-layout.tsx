import { Outlet } from "react-router"
import { Provider, Drawer, Wrapper, Trigger } from "@/components/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { COBreadcrumb } from "./breadcrumb"


export function AppLayout() {
  return (
    <Provider className="p-2 h-screen">
      <Drawer />
      <Wrapper className="relative shadow-2xl">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <Trigger />
          <COBreadcrumb />
        </header>

        <ScrollArea className="flex-1 min-h-0" fill>
          <main className="p-6">
            <Outlet />
          </main>
          </ScrollArea>
      </Wrapper>
    </Provider>
  )
}

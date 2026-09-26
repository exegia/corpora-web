import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs"
import type { TTabItem } from "./types"
import { NavLink, Outlet, useLocation } from "react-router"
import type { TabsPanelProps } from "@base-ui/react"
import type { FC, ReactNode } from "react"

export function ExploreTabs({ tabs, panel }: { tabs: TTabItem[], panel: ReactNode }) {
    const { pathname } = useLocation()

    return (
        <Tabs defaultValue="tab-1">
            <div className="border-b">
                <TabsList variant="underline">
                    {tabs.map((item, index) => (
                        <TabsTab render={<NavLink to={item.value} viewTransition />} key={index} value={item.value}>
                            {item.label}
                        </TabsTab>
                    ))}
                </TabsList>
            </div>
            {/*<TabsPanel render={<Outlet />} value={pathname} />*/}
          {panel}
        </Tabs>
    )
}

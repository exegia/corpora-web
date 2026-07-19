import {
  BookMarked,
  BookOpen,
  Database,
  FolderKanban,
  LayoutDashboard,
} from "lucide-react"
import { NavLink } from "react-router"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "References", url: "/references", icon: BookMarked },
  { title: "Library", url: "/library", icon: BookOpen },
  { title: "Project", url: "/project", icon: FolderKanban },
  { title: "Corpus", url: "/corpus", icon: Database },
]

export function AppSidebar() {
  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <span className="px-2 py-1.5 font-heading text-lg font-bold">
          Corpora
        </span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <NavLink to={item.url} end={item.url === "/"} >
                    {({ isActive }) => (
                      <SidebarMenuButton isActive={isActive} className={cn("cursor-pointer bg-transparent", isActive && "bg-amber-400/70!")}>
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    )}
                  </NavLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

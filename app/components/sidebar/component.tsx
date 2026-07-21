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
import { default as Logo } from "@/components/logo";
import { cn } from "@/lib/utils"

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "References", url: "/references", icon: BookMarked },
  { title: "Library", url: "/library", icon: BookOpen },
  { title: "Project", url: "/project", icon: FolderKanban },
  { title: "Corpus", url: "/corpus", icon: Database },
]

const AppSidebar = () => {
  return (
    <Sidebar variant="inset">
      <SidebarHeader className="flex flex-row items-center justify-center">
        <Logo className="fill-amber-400 w-8 h-8 transform rotate-12" />
        <span className="font-heading text-2xl font-medium text-foreground">
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
                      <SidebarMenuButton isActive={isActive} className={cn("cursor-pointer bg-transparent transition-all ease-in-out duration-200", isActive && "bg-accent!")}>
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

export default AppSidebar;

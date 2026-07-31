import {
  BookMarked,
  BookOpen,
  Database,
  FolderKanban,
  LayoutDashboard,
  Scale,
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
import { Spinner } from "@/components/ui/spinner"
import { default as Logo } from "@/components/logo";
import { cn } from "@/lib/utils"

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "References", url: "/references", icon: BookMarked },
  { title: "Library", url: "/library", icon: BookOpen },
  { title: "Project", url: "/project", icon: FolderKanban },
  { title: "Corpus", url: "/corpus", icon: Database },
  { title: "Licenses", url: "/licenses", icon: Scale },
]

const AppSidebar = () => {
  return (
    <Sidebar variant="inset">
      <SidebarHeader className="flex flex-row items-center justify-center">
        <Logo className="fill-amber-400 w-8 h-8 transform rotate-12" />
        <span className="text-2xl font-medium text-foreground font-serif">
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
                  {/* isPending: react-router's local pending navigation. Route
                      modules are code-split, so this covers the chunk fetch on
                      a first visit; loaders themselves no longer block. */}
                  <NavLink to={item.url} end={item.url === "/"} viewTransition>
                    {({ isActive, isPending }) => (
                      <SidebarMenuButton
                        isActive={isActive}
                        data-cuelume-hover="tick"
                        className={cn("cursor-pointer bg-transparent transition-all ease-in-out duration-200", isActive && "bg-accent!")}
                      >
                        {isPending ? <Spinner /> : <item.icon />}
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

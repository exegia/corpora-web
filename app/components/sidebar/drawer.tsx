import { BookMarked, BookOpen, Database, FolderKanban, LayoutDashboard, Scale } from "lucide-react"
import { NavLink } from "react-router"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import { default as Logo } from "@/components/logo"
import ProfileCard from "@/components/sidebar/profile-card"
import type { DrawerProps } from "@/components/sidebar/types"
import { cn } from "@/lib/utils"

const items = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "References", url: "/references", icon: BookMarked },
    { title: "Library", url: "/library", icon: BookOpen },
    { title: "Project", url: "/project", icon: FolderKanban },
    { title: "Corpus", url: "/corpus", icon: Database },
    { title: "Licenses", url: "/licenses", icon: Scale },
]

/** The app's navigation drawer, with the account card pinned at its foot. */
export default function Drawer({ user }: DrawerProps) {
    return (
        <Sidebar variant="inset">
            <SidebarHeader className="flex flex-row items-center justify-center">
                <Logo className="h-8 w-8 rotate-12 transform fill-amber-400" />
                <span className="font-serif text-2xl font-medium text-foreground">Corpora</span>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map(item => (
                                <SidebarMenuItem key={item.title}>
                                    {/* isPending: react-router's local pending navigation. Route
                                        modules are code-split, so this covers the chunk fetch on
                                        a first visit; loaders themselves no longer block. */}
                                    <NavLink to={item.url} viewTransition>
                                        {({ isActive, isPending }) => (
                                            <SidebarMenuButton
                                                isActive={isActive}
                                                data-cuelume-hover="tick"
                                                className={cn(
                                                    "cursor-pointer bg-transparent transition-all duration-200 ease-in-out",
                                                    isActive && "bg-accent!"
                                                )}>
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
            {user && (
                <SidebarFooter>
                    <ProfileCard user={user} />
                </SidebarFooter>
            )}
        </Sidebar>
    )
}

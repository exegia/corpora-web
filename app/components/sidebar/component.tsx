import {
  ProfileCardBlock,
  type ProfileCardItem,
} from "@exegia/corpora-ui"
import {
  BookMarked,
  BookOpen,
  Database,
  FolderKanban,
  LayoutDashboard,
  LogOutIcon,
  Scale,
  UserIcon,
} from "lucide-react"
import { NavLink, useFetcher, useNavigate } from "react-router"
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
import { default as Logo } from "@/components/logo";
import type { SessionUser } from "@/lib/auth"
import { cn } from "@/lib/utils"

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "References", url: "/references", icon: BookMarked },
  { title: "Library", url: "/library", icon: BookOpen },
  { title: "Project", url: "/project", icon: FolderKanban },
  { title: "Corpus", url: "/corpus", icon: Database },
  { title: "Licenses", url: "/licenses", icon: Scale },
]

/** The account card pinned under the navigation. */
function ProfileCard({ user }: { user: SessionUser }) {
  const navigate = useNavigate()
  // Sign-out is a mutation posted to /logout, not a link — see routes/logout.
  // Returning the submit promise keeps the card in its loading state until
  // the action's redirect lands.
  const fetcher = useFetcher()

  const menu: ProfileCardItem[] = [
    { type: "label", label: "Account" },
    {
      id: "profile",
      label: "Profile",
      icon: <UserIcon aria-hidden="true" />,
      onSelect: () => navigate("/profile", { viewTransition: true }),
    },
    { type: "separator" },
    {
      id: "sign-out",
      label: "Log out",
      icon: <LogOutIcon aria-hidden="true" />,
      variant: "destructive",
      onSelect: () => fetcher.submit(null, { method: "post", action: "/logout" }),
    },
  ]

  return (
    <ProfileCardBlock
      align="start"
      items={menu}
      side="top"
      user={{
        name: user.name ?? user.email,
        username: user.email,
        avatar: user.avatarUrl ?? undefined,
      }}
    />
  )
}

const AppSidebar = ({ user }: { user?: SessionUser }) => {
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
      {user && (
        <SidebarFooter>
          <ProfileCard user={user} />
        </SidebarFooter>
      )}
    </Sidebar>
  )
}

export default AppSidebar;

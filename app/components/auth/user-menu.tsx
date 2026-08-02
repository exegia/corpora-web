import { LogOut } from "lucide-react"
import { useFetcher } from "react-router"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Menu, MenuItem, MenuPopup, MenuPortal, MenuTrigger } from "@/components/ui/menu"
import type { SessionUser } from "@/lib/auth"

/** "Ada Researcher" → "AR"; falls back to the email's first letter. */
function initials(user: SessionUser): string {
  const source = user.name?.trim()
  if (!source) return (user.email[0] ?? "?").toUpperCase()
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function UserMenu({ user }: { user: SessionUser }) {
  // Sign-out is a mutation posted to /logout, not a link — see routes/logout.
  const fetcher = useFetcher()
  const signingOut = fetcher.state !== "idle"

  return (
    <Menu>
      <MenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Account menu for ${user.name ?? user.email}`}
          >
            <Avatar className="size-7">
              <AvatarFallback className="text-xs">{initials(user)}</AvatarFallback>
            </Avatar>
          </Button>
        }
      />
      <MenuPortal>
        <MenuPopup align="end" className="min-w-56">
          <div className="flex flex-col gap-0.5 px-2 py-1.5">
            {user.name && <span className="text-sm font-medium">{user.name}</span>}
            <span className="text-muted-foreground truncate text-xs">{user.email}</span>
          </div>
          <MenuItem
            disabled={signingOut}
            onClick={() => fetcher.submit(null, { method: "post", action: "/logout" })}
          >
            <LogOut />
            {signingOut ? "Signing out…" : "Sign out"}
          </MenuItem>
        </MenuPopup>
      </MenuPortal>
    </Menu>
  )
}

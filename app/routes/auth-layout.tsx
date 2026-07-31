import { Outlet } from "react-router"
import { SoundToggle } from "@/components/sound-toggle"
import { ThemeToggle } from "@/components/theme-toggle"
import { useUISounds } from "@/lib/sounds"

/**
 * Chrome for every auth screen: a centered column, no sidebar, no breadcrumb.
 *
 * Deliberately *unguarded*. `/login`, `/signup` and `/forgot-password` are
 * guest-only and say so in their own loaders; `/reset-password`,
 * `/verify` and `/auth/callback` are reached mid-flow — a recovery link signs
 * the user in before they land — so a blanket `requireAnon` here would bounce
 * them straight back out.
 */
export default function AuthLayout() {
  useUISounds()

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden p-6">
      {/* Ambient wash behind the card; purely decorative. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,var(--color-accent)_0%,transparent_70%)] opacity-60"
      />
      <div className="absolute right-4 top-4 flex items-center gap-1">
        <SoundToggle />
        <ThemeToggle />
      </div>
      <div className="relative flex w-full max-w-sm flex-col items-center">
        <Outlet />
      </div>
    </div>
  )
}

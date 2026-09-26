import { Blocks } from "@/components/blocks"
import { Outlet } from "react-router"
import { useUISounds } from "@/lib/sounds"
import Threads from "@/components/threads"

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
        <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden select-none dark:bg-black!">
            {/* Ambient wash behind the card; purely decorative. */}

            <Threads
                color={[0.9176470588235294, 0.7019607843137254, 0.03137254901960784]}
                amplitude={2.1}
                distance={0.8}
                enableMouseInteraction
                className="absolute! inset-0 m-0 h-screen w-full"
            />

            <div className="absolute top-4 right-4 flex items-center gap-1">
                <Blocks.Sound />
                <Blocks.Theme />
            </div>
            <div className="relative flex w-full max-w-sm flex-col items-center rounded-3xl border border-border shadow-md shadow-black/5 backdrop-blur-md">
                <Outlet />
            </div>
        </div>
    )
}

import { useEffect } from "react"
import { useStore } from "jotai"
import { resetChatAtom } from "@/components/corpus/chat/state"
import { dismissConversionAtom } from "@/components/corpus/convert/store"
import ConversionRuntime from "@/components/corpus/convert/runtime"
import { requireSession } from "@/lib/auth"
import { useUISounds } from "@/lib/sounds"
import type { Route } from "./+types/protected-layout"
import { AppLayout } from "./app-layout"
import { useAppShellPanels } from "./shell-layout"

/** Keep loader data limited to user so it cannot shadow breadcrumb records. */
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
    const user = await requireSession(request)
    return { user }
}

/** Owns the protected shell and feature lifetimes for the authenticated session. */
export default function ProtectedLayout({ loaderData }: Route.ComponentProps) {
    const { user } = loaderData
    useUISounds()
    const store = useStore()
    const { openPanel, setOpen, setOpenMobile } = useAppShellPanels()

    useEffect(() => () => {
        store.set(dismissConversionAtom)
        store.set(resetChatAtom)
        // Drop feature elements as well as visibility when leaving the session.
        openPanel("right", null)
        setOpen(false, "right")
        setOpenMobile(false, "right")
    }, [store, user.id, openPanel, setOpen, setOpenMobile])

    return (
        <>
            <ConversionRuntime key={user.id} />
            <AppLayout user={user} />
        </>
    )
}

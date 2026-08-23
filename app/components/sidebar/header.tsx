import { AnimatedSidebarPanelContext } from "@exegia/corpora-ui"
import { useContext } from "react"
import { default as Logo } from "@/components/logo"

export function Header() {
    // Folds with the rail: the wordmark slides to nothing, the logo stays put.
    const collapsed = useContext(AnimatedSidebarPanelContext)?.collapsed ?? false

    return (
        <div className="flex flex-1 items-center justify-center">
            <Logo className="h-8 w-8 shrink-0 rotate-12 transform fill-amber-400" />
            <span
                className={`overflow-hidden font-serif text-2xl font-medium whitespace-nowrap text-foreground transition-[max-width,opacity,margin] duration-200 ${
                    collapsed ? "ml-0 max-w-0 opacity-0" : "ml-2 max-w-40 opacity-100"
                }`}>
                Corpora
            </span>
        </div>
    )
}

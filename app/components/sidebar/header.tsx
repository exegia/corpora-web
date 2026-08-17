import { default as Logo } from "@/components/logo"

export function Header() {
    return (
        <div className="flex flex-1 items-center justify-center gap-2">
            <Logo className="h-8 w-8 rotate-12 transform fill-amber-400" />
            <span className="font-serif text-2xl font-medium text-foreground">Corpora</span>
        </div>
    )
}

import Logo from "@/components/logo"

/** Brand mark rendered above every auth card's title. */
export default function AuthLogo() {
    return (
        <div className="mb-6 flex w-full flex-row items-center justify-start gap-2">
            <Logo className="size-10 rotate-12 fill-amber-400" />
            <h2 className="font-serif text-2xl">Corpora</h2>
        </div>
    )
}

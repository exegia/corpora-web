import type { AuthAccent, SocialProvider } from "@exegia/corpora-ui"
import Logo from "@/components/logo"

/** Brand accent applied to every auth block's primary action. */
export const AUTH_ACCENT: AuthAccent = "corpora"

/**
 * Social providers offered on login and signup.
 *
 * Each one must also be enabled in the Supabase dashboard (Authentication →
 * Providers) and its callback allowlisted under URL Configuration. Trim this
 * array to `[]` to hide the section entirely.
 */
export const AUTH_PROVIDERS: SocialProvider[] = ["google", "github"]

/**
 * How long the success state stays up before the route navigates away. Long
 * enough for the block's morph to read, short enough not to feel like a stall.
 */
export const SUCCESS_MORPH_MS = 450

/** Brand mark rendered above every auth card's title. */
export function AuthLogo() {
    return <div className="flex flex-row items-center gap-2 mb-6 justify-start w-full">
        <Logo className="size-10 rotate-12 fill-amber-400" />
        <h2 className="text-2xl font-serif">Corpora</h2>
    </div>
}

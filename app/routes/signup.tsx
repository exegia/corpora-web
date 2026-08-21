import { Blocks } from "@/components/blocks"
import type { SocialProvider } from "@exegia/corpora-ui"
import { SignupBlock } from "@exegia/corpora-ui"
import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { Auth } from "@/components/auth"
import { Button } from "@/components/ui/button"
import { DEFAULT_AUTHENTICATED_PATH, requireAnon, safeRedirectTo, signInWithProvider, signUpWithPassword } from "@/lib/auth"
import type { Route } from "./+types/signup"

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
    await requireAnon(request)
    return null
}

export default function Signup() {
    const navigate = useNavigate()
    const [params] = useSearchParams()
    const redirectTo = safeRedirectTo(params.get("redirectTo"))
    const search = redirectTo === DEFAULT_AUTHENTICATED_PATH ? "" : `?redirectTo=${encodeURIComponent(redirectTo)}`
    // Consent is controlled here, so the dialog's "I agree" can tick the box.
    // The dialog owns its own open state.
    const [termsAccepted, setTermsAccepted] = useState(false)

    return (
        <SignupBlock
            logo={<Auth.Logo />}
            accent={Auth.ACCENT}
            providers={Auth.PROVIDERS}
            onSubmit={async ({ name, email, password }) => {
                const { needsConfirmation } = await signUpWithPassword({ name, email, password })
                // With email confirmation on (the Supabase default) there is no
                // session yet — hand off to /verify instead of the app.
                const next = needsConfirmation ? `/verify?email=${encodeURIComponent(email)}` : redirectTo
                window.setTimeout(() => navigate(next, { replace: true }), Auth.SUCCESS_MORPH_MS)
            }}
            onProviderSelect={async (provider: SocialProvider) => {
                // The document navigates away to the provider, so this settles
                // only when the redirect could not start — the block renders
                // the rejection. The round-trip returns via /auth/callback.
                await signInWithProvider(provider, redirectTo)
            }}
            onLogin={() => navigate(`/login${search}`)}
            termsChecked={termsAccepted}
            onTermsCheckedChange={setTermsAccepted}
            // Rendered in place of the block's built-in "terms" link. A
            // dialog rather than a navigation: reading the terms must not
            // discard a half-filled signup form.
            termsComponent={
                <Blocks.Terms
                    trigger={
                        <Button variant="link" type="button">
                            terms
                        </Button>
                    }
                    onAgree={() => setTermsAccepted(true)}
                />
            }
        />
    )
}

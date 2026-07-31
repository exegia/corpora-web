import { SignupBlock } from "@exegia/corpora-ui"
import type { SocialProvider } from "@exegia/corpora-ui"
import { useNavigate, useSearchParams } from "react-router"
import { AuthLogo, AUTH_ACCENT, AUTH_PROVIDERS, SUCCESS_MORPH_MS } from "@/components/auth"
import { requireAnon, safeRedirectTo, signInWithProvider, signUpWithPassword } from "@/lib/auth"
import type { Route } from "./+types/signup"

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  await requireAnon(request)
  return null
}

export default function Signup() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const redirectTo = safeRedirectTo(params.get("redirectTo"))
  const search = redirectTo === "/" ? "" : `?redirectTo=${encodeURIComponent(redirectTo)}`

  return (
    <SignupBlock
      logo={<AuthLogo />}
      accent={AUTH_ACCENT}
      providers={AUTH_PROVIDERS}
      onSubmit={async ({ name, email, password }) => {
        const { needsConfirmation } = await signUpWithPassword({ name, email, password })
        // With email confirmation on (the Supabase default) there is no
        // session yet — hand off to /verify instead of the app.
        const next = needsConfirmation
          ? `/verify?email=${encodeURIComponent(email)}`
          : redirectTo
        window.setTimeout(() => navigate(next, { replace: true }), SUCCESS_MORPH_MS)
      }}
      onProviderSelect={async (provider: SocialProvider) => {
        await signInWithProvider(provider, redirectTo)
        window.setTimeout(() => navigate(redirectTo, { replace: true }), SUCCESS_MORPH_MS)
      }}
      onLogin={() => navigate(`/login${search}`)}
      // New tab, not a navigation: reading the terms must not discard a
      // half-filled signup form.
      onTerms={() => window.open("/terms", "_blank", "noopener,noreferrer")}
    />
  )
}

import { LoginBlock } from "@exegia/corpora-ui"
import type { SocialProvider } from "@exegia/corpora-ui"
import { useNavigate, useSearchParams } from "react-router"
import { Auth } from "@/components/auth"
import { DEFAULT_AUTHENTICATED_PATH, requireAnon, safeRedirectTo, signInWithPassword, signInWithProvider } from "@/lib/auth"
import type { Route } from "./+types/login"

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  await requireAnon(request)
  return null
}

export default function Login() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const redirectTo = safeRedirectTo(params.get("redirectTo"))
  const search = redirectTo === DEFAULT_AUTHENTICATED_PATH ? "" : `?redirectTo=${encodeURIComponent(redirectTo)}`

  return (
    <LoginBlock
      logo={<Auth.Logo />}
      accent={Auth.ACCENT}
      providers={Auth.PROVIDERS}
      // supabase-js persists the session either way and exposes no per-call
      // toggle, so the checkbox would be decorative. Hidden rather than lying.
      showRememberMe={false}
      onSubmit={async ({ email, password }) => {
        await signInWithPassword({ email, password })
        // Resolving first lets the block morph to its success state; the nav
        // follows one beat later so that morph is actually seen.
        window.setTimeout(() => navigate(redirectTo, { replace: true }), Auth.SUCCESS_MORPH_MS)
      }}
      onProviderSelect={async (provider: SocialProvider) => {
        // The document navigates away to the provider, so this settles only
        // when the redirect could not start — the block renders the rejection.
        // The round-trip returns via a full page load on /auth/callback.
        await signInWithProvider(provider, redirectTo)
      }}
      onForgotPassword={() => navigate(`/forgot-password${search}`)}
      onSignup={() => navigate(`/signup${search}`)}
    />
  )
}

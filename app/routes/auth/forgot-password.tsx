import { ForgotPasswordBlock } from "@exegia/corpora-ui"
import { useNavigate, useSearchParams } from "react-router"
import { Auth } from "@/components/auth"
import { DEFAULT_AUTHENTICATED_PATH, requireAnon, safeRedirectTo, sendPasswordReset } from "@/lib/auth"
import type { Route } from "./+types/forgot-password"

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  await requireAnon(request)
  return null
}

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const redirectTo = safeRedirectTo(params.get("redirectTo"))
  const search = redirectTo === DEFAULT_AUTHENTICATED_PATH ? "" : `?redirectTo=${encodeURIComponent(redirectTo)}`

  return (
    <ForgotPasswordBlock
      logo={<Auth.Logo />}
      accent={Auth.ACCENT}
      // The block owns the "check your inbox" success state, so there is no
      // navigation here — the emailed link resumes the flow at /auth/callback.
      onSubmit={({ email }) => sendPasswordReset(email)}
      onBackToLogin={() => navigate(`/login${search}`)}
    />
  )
}

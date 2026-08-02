import { AuthCard, Button } from "@exegia/corpora-ui"
import { redirect, useNavigate } from "react-router"
import { AuthLogo, AUTH_ACCENT } from "@/components/auth"
import { AuthError, completeAuthRedirect } from "@/lib/auth"
import type { Route } from "./+types/auth.callback"

/**
 * Where every out-of-app auth journey comes back to: an OAuth provider, a
 * signup confirmation link, or a password-reset link.
 *
 * Unguarded by design — the visitor is mid-handshake and is neither reliably
 * signed in nor reliably signed out when they arrive.
 *
 * The work happens in the loader so the redirect is part of the navigation
 * rather than a flash of UI followed by a second one. Only the failure path
 * renders anything.
 */
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  try {
    const { user, next } = await completeAuthRedirect(request.url)
    if (!user) {
      return {
        error:
          "That link has expired or has already been used. Request a new one and try again.",
      }
    }
    throw redirect(next)
  } catch (cause) {
    // A thrown redirect is a Response and must travel on untouched; only a
    // genuine failure becomes an error message.
    if (cause instanceof Response) throw cause
    return {
      error:
        cause instanceof AuthError
          ? cause.message
          : "Something went wrong completing sign in.",
    }
  }
}

export default function AuthCallback({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate()

  return (
    <AuthCard
      logo={<AuthLogo />}
      accent={AUTH_ACCENT}
      title="We couldn't finish signing you in"
      description={loaderData.error}
    >
      <Button className="w-full" onClick={() => navigate("/login", { replace: true })}>
        Back to login
      </Button>
    </AuthCard>
  )
}

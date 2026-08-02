import { CodeAuthBlock } from "@exegia/corpora-ui"
import { useNavigate, useSearchParams } from "react-router"
import { AuthLogo, AUTH_ACCENT, SUCCESS_MORPH_MS } from "@/components/auth"
import { resendSignupConfirmation, safeRedirectTo, verifySignupCode } from "@/lib/auth"

/**
 * Confirms a new account with the 6-digit code emailed at signup.
 *
 * Deliberately unguarded: the visitor has an account but no session yet, so
 * neither `requireSession` nor `requireAnon` describes them.
 */
export default function Verify() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const email = params.get("email") ?? ""
  const redirectTo = safeRedirectTo(params.get("redirectTo"))

  return (
    <CodeAuthBlock
      logo={<AuthLogo />}
      accent={AUTH_ACCENT}
      channel="email"
      destination={maskEmail(email)}
      onVerify={async (code) => {
        await verifySignupCode(email, code)
        window.setTimeout(() => navigate(redirectTo, { replace: true }), SUCCESS_MORPH_MS)
      }}
      onResend={() => resendSignupConfirmation(email)}
      onBack={() => navigate("/signup", { replace: true })}
    />
  )
}

/** `ada@corpora.local` → `a••@corpora.local`. Empty input stays empty. */
function maskEmail(email: string): string | undefined {
  const at = email.indexOf("@")
  if (at < 1) return undefined
  const local = email.slice(0, at)
  const shown = local.slice(0, 1)
  return `${shown}${"•".repeat(Math.max(local.length - 1, 1))}${email.slice(at)}`
}

import {
  AuthCard,
  AuthError,
  AuthSuccess,
  authAccentActionStyles,
  Button,
  Field,
  FieldLabel,
  MorphStep,
  PasswordInput,
  Reveal,
  type AuthStatus,
} from "@exegia/corpora-ui"
import { useId, useState } from "react"
import { useNavigate } from "react-router"
import { Auth } from "@/components/auth"
import { getCurrentUser, updatePassword } from "@/lib/auth"
import type { Route } from "./+types/reset-password"

/**
 * Set a new password after following the recovery link.
 *
 * The package has no block for this step — `ForgotPasswordBlock` only sends
 * the email — so it is composed here from the same shell the blocks use.
 *
 * No `requireAnon`: Supabase signs the user in with a recovery session when
 * they follow the link, so arriving here *authenticated* is the happy path.
 * Arriving with no session at all means the link expired.
 */
export async function clientLoader() {
  return { hasRecoverySession: (await getCurrentUser()) !== null }
}

export default function ResetPassword({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate()
  const passwordId = useId()
  const confirmId = useId()
  const [status, setStatus] = useState<AuthStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")

  // Mirrors the checklist `PasswordInput showStrength` renders — the confirm
  // field must not unlock while requirements are still showing as unmet.
  const strong =
    password.length >= 8 &&
    /[0-9]/.test(password) &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password)
  const matches = confirm.length > 0 && confirm === password
  const canSubmit = strong && matches && status !== "loading"

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return
    setError(null)
    setStatus("loading")
    try {
      await updatePassword(password)
      setStatus("success")
    } catch (cause) {
      setStatus("idle")
      setError(cause instanceof Error ? cause.message : "Unable to update your password.")
    }
  }

  if (!loaderData.hasRecoverySession) {
    return (
      <AuthCard
        logo={<Auth.Logo />}
        accent={Auth.ACCENT}
        title="This link has expired"
        description="Password reset links can only be used once, and time out after an hour."
      >
        <Button
          className="w-full"
          onClick={() => navigate("/forgot-password", { replace: true })}
        >
          Request a new link
        </Button>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      logo={<Auth.Logo />}
      accent={Auth.ACCENT}
      title="Choose a new password"
      description="Pick something you haven't used here before"
    >
      <MorphStep step={status === "success" ? "success" : "form"}>
        {status === "success" ? (
          <AuthSuccess
            title="Password updated"
            description="You're signed in with your new password."
          >
            <Button
              className={authAccentActionStyles}
              onClick={() => navigate("/", { replace: true })}
            >
              Continue to Corpora
            </Button>
          </AuthSuccess>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Field>
              <FieldLabel htmlFor={passwordId}>New password</FieldLabel>
              <PasswordInput
                id={passwordId}
                name="password"
                autoComplete="new-password"
                required
                showStrength
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>

            {/* Progressive disclosure, matching the upstream blocks: the
                confirmation only appears once the new password is usable. */}
            <Reveal show={strong}>
              <Field>
                <FieldLabel htmlFor={confirmId}>Confirm password</FieldLabel>
                <PasswordInput
                  id={confirmId}
                  name="confirmPassword"
                  autoComplete="new-password"
                  required
                  visibilityToggle={false}
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                />
              </Field>
            </Reveal>

            <AuthError message={error} />

            <Reveal show={canSubmit || status === "loading"}>
              <Button
                type="submit"
                className={`w-full ${authAccentActionStyles}`}
                loading={status === "loading"}
              >
                Update password
              </Button>
            </Reveal>
          </form>
        )}
      </MorphStep>
    </AuthCard>
  )
}

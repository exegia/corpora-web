import { getSupabase } from "@/lib/supabase"
import { callbackUrl } from "./oauth"
import { toSessionUser } from "./session"
import { AuthError, type SessionUser, type SignUpResult } from "./types"

// ---- Credentials ---------------------------------------------------------

export async function signInWithPassword(credentials: {
  email: string
  password: string
}): Promise<SessionUser> {
  const { data, error } = await getSupabase().auth.signInWithPassword({
    email: credentials.email.trim(),
    password: credentials.password,
  })
  if (error) {
    // Supabase returns one message for a wrong password and for an address
    // with no account — deliberately, so the form cannot be used to probe who
    // has signed up. Rephrased, not narrowed.
    throw new AuthError(
      error.message === "Invalid login credentials"
        ? "That email and password don't match an account."
        : (error.message ?? "Unable to login."),
    )
  }
  if (!data.user) throw new AuthError("Unable to login.")
  return toSessionUser(data.user)
}

export async function signUpWithPassword(details: {
  name?: string
  email: string
  password: string
}): Promise<SignUpResult> {
  const { data, error } = await getSupabase().auth.signUp({
    email: details.email.trim(),
    password: details.password,
    options: {
      data: details.name?.trim() ? { name: details.name.trim() } : undefined,
      emailRedirectTo: callbackUrl(),
    },
  })
  if (error) throw new AuthError(error.message ?? "Unable to create your account.")
  return {
    user: data.user ? toSessionUser(data.user) : null,
    // No session means confirmation is required. Supabase also returns a
    // user-shaped response with no session for an address that already exists,
    // which is intentional — it refuses to confirm who has an account. Both
    // land on /verify, which is the correct behaviour for both.
    needsConfirmation: data.session === null,
  }
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabase().auth.signOut()
  if (error) throw new AuthError(error.message ?? "Unable to sign out.")
}

// ---- Password recovery ---------------------------------------------------

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
    redirectTo: callbackUrl("/reset-password"),
  })
  if (error) throw new AuthError(error.message ?? "Unable to send the reset link.")
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await getSupabase().auth.updateUser({ password })
  if (error) throw new AuthError(error.message ?? "Unable to update your password.")
}

// ---- Email confirmation --------------------------------------------------

/**
 * Verifies the 6-digit signup code and starts the session.
 *
 * Only reachable when the "Confirm signup" email template sends `{{ .Token }}`.
 * Supabase ships that template sending `{{ .ConfirmationURL }}` instead, in
 * which case the user follows a link and lands on `/auth/callback` — so both
 * routes exist and either template works.
 */
export async function verifySignupCode(
  email: string,
  code: string,
): Promise<SessionUser> {
  const { data, error } = await getSupabase().auth.verifyOtp({
    email: email.trim(),
    token: code,
    type: "signup",
  })
  if (error) throw new AuthError(error.message ?? "That code is not valid.")
  if (!data.user) throw new AuthError("That code is not valid.")
  return toSessionUser(data.user)
}

export async function resendSignupConfirmation(email: string): Promise<void> {
  const { error } = await getSupabase().auth.resend({
    type: "signup",
    email: email.trim(),
    options: { emailRedirectTo: callbackUrl() },
  })
  if (error) throw new AuthError(error.message ?? "Unable to resend the code.")
}

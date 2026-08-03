// Data-access layer for authentication (Supabase Auth).
//
// Route modules import ONLY from this module — never supabase-js directly,
// matching `lib/projects` and `lib/users`.
//
// The blocks in `@exegia/corpora-ui` surface a failure by *rejecting* the
// submit handler and rendering `error.message`, so every function here throws
// an `AuthError` whose message is already fit to show a user.

import { configureWeb } from "@exegia/plugin-supabase-auth/web"
import { authActions, resolveMessage } from "@exegia/use-auth"
import type { Provider, User } from "@supabase/supabase-js"
import { redirect } from "react-router"
import { getSupabase } from "@/lib/supabase"

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AuthError"
  }
}

export interface SessionUser {
  id: string
  email: string
  name: string | null
  emailConfirmed: boolean
}

export type AuthProvider = Provider

/** Paths served by the auth layout — never a valid post-login destination. */
export const AUTH_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify",
  "/auth/callback",
] as const

export const LOGIN_PATH = "/login"
export const DEFAULT_AUTHENTICATED_PATH = "/"

// ---- Session -------------------------------------------------------------

function toSessionUser(user: User): SessionUser {
  const meta = user.user_metadata ?? {}
  const name = meta.name ?? meta.full_name
  return {
    id: user.id,
    email: user.email ?? "",
    name: typeof name === "string" && name.trim() ? name.trim() : null,
    emailConfirmed: Boolean(user.email_confirmed_at ?? user.confirmed_at),
  }
}

/**
 * The signed-in user, or null.
 *
 * Reads the persisted session rather than calling `getUser()`, so a route
 * guard costs no network round-trip on every navigation — supabase-js refreshes
 * the token in the background. That makes this a claim about the *token*, not a
 * server re-validation; the server re-checks on every data request anyway, via
 * RLS, which is where authorisation actually belongs.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const { data, error } = await getSupabase().auth.getSession()
  if (error) {
    throw new AuthError(
      `Could not read the session: ${error.message ?? "unexpected error"}`,
    )
  }
  const user = data.session?.user
  return user ? toSessionUser(user) : null
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getCurrentUser()) !== null
}

// ---- Redirect safety -----------------------------------------------------

/**
 * Narrows a `?redirectTo=` value to a same-origin app path that is not itself
 * an auth screen. Anything else collapses to the default, which is what keeps
 * `/login → / → /login` from ping-ponging and blocks open redirects.
 */
export function safeRedirectTo(
  value: string | null | undefined,
  fallback: string = DEFAULT_AUTHENTICATED_PATH,
): string {
  if (!value) return fallback
  // Absolute URLs, protocol-relative URLs and backslash tricks are all out.
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback
  }
  const path = value.split("?")[0].split("#")[0]
  if (AUTH_PATHS.some((auth) => path === auth || path.startsWith(`${auth}/`))) {
    return fallback
  }
  return value
}

function pathWithSearch(request: Request): string {
  const url = new URL(request.url)
  return `${url.pathname}${url.search}`
}

// ---- Route guards --------------------------------------------------------

/**
 * Guard for authenticated routes. Throws a redirect to `/login`, carrying the
 * attempted location so the login screen can send the user back afterwards.
 */
export async function requireSession(request: Request): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (user) return user
  const from = pathWithSearch(request)
  const search =
    from === DEFAULT_AUTHENTICATED_PATH
      ? ""
      : `?redirectTo=${encodeURIComponent(from)}`
  throw redirect(`${LOGIN_PATH}${search}`)
}

/**
 * Guard for the auth screens themselves: an already-signed-in visitor is sent
 * on to the app (or to a vetted `?redirectTo=`).
 */
export async function requireAnon(request: Request): Promise<null> {
  const user = await getCurrentUser()
  if (!user) return null
  const url = new URL(request.url)
  throw redirect(safeRedirectTo(url.searchParams.get("redirectTo")))
}

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

export interface SignUpResult {
  user: SessionUser | null
  /** True when the address must be confirmed before the account is usable. */
  needsConfirmation: boolean
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

// ---- OAuth ---------------------------------------------------------------

let authBindingsConfigured = false

/**
 * Points the `@exegia/use-auth` bindings at the app's own supabase-js client,
 * so both share one session, one storage key and one refresh timer — two
 * GoTrue clients on the same storage key fight over the refresh. Lazy rather
 * than a module-scope side effect so importing this file never constructs a
 * client (tests mock `@/lib/supabase`; the SPA-mode build imports route
 * modules in Node). Every binding-backed function calls this first, which is
 * what "configure before any binding runs" requires.
 */
function ensureAuthBindings(): void {
  if (authBindingsConfigured) return
  configureWeb({ client: getSupabase().auth })
  authBindingsConfigured = true
}

/**
 * The post-sign-in destination has to survive the OAuth round-trip. The web
 * bindings send no `redirect_to` — GoTrue returns the browser to the
 * project's Site URL — so unlike the emailed links the destination cannot
 * travel as `?next=` in the URL. sessionStorage is same-tab, same-origin,
 * which is exactly the scope of a redirect round-trip.
 */
const OAUTH_NEXT_KEY = "corpora.oauth.next"

function stashOAuthNext(next: string): void {
  try {
    if (next === DEFAULT_AUTHENTICATED_PATH) sessionStorage.removeItem(OAUTH_NEXT_KEY)
    else sessionStorage.setItem(OAUTH_NEXT_KEY, next)
  } catch {
    // Storage can be unavailable (private mode). Losing the continuation only
    // means landing on the default page after sign-in.
  }
}

function consumeOAuthNext(): string | null {
  try {
    const next = sessionStorage.getItem(OAUTH_NEXT_KEY)
    sessionStorage.removeItem(OAUTH_NEXT_KEY)
    return next
  } catch {
    return null
  }
}

/**
 * Starts a provider handshake through the `@exegia/use-auth` bindings. This
 * navigates the whole document, so on success the promise never settles in
 * this document — do not gate anything on it resolving. It settles only when
 * the redirect could not be started, rejecting with the auth kit's
 * user-facing message for the structured error kind (`configuration`,
 * `oauthFlowInterrupted`, …).
 *
 * The provider must be enabled in the Supabase dashboard (Authentication →
 * Providers), and the return leg lands wherever the project's Site URL
 * points — neither is reachable from this codebase.
 */
export async function signInWithProvider(
  provider: AuthProvider,
  redirectTo?: string | null,
): Promise<void> {
  ensureAuthBindings()
  stashOAuthNext(safeRedirectTo(redirectTo))
  const result = await authActions.signInWithOAuth({ provider })
  if (!result.ok) {
    consumeOAuthNext()
    throw new AuthError(resolveMessage(result.error))
  }
}

// ---- Redirect landing ----------------------------------------------------

/**
 * Completes a return from an emailed link or an OAuth provider, and reports
 * where to send the user next.
 *
 * supabase-js consumes an implicit-flow fragment on its own at client start;
 * the PKCE `?code=` flow needs this explicit exchange. Handling both means the
 * route works whichever flow the project is configured for.
 */
export async function completeAuthRedirect(
  href: string,
): Promise<{ user: SessionUser | null; next: string }> {
  const url = new URL(href)
  const params = url.searchParams
  // Errors arrive in the query on PKCE and in the fragment on implicit flow.
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""))
  const description = params.get("error_description") ?? hash.get("error_description")
  if (description) throw new AuthError(description)

  const code = params.get("code")
  if (code) {
    const { error } = await getSupabase().auth.exchangeCodeForSession(code)
    if (error) throw new AuthError(error.message ?? "Unable to complete sign in.")
  }

  // Emailed links carry `?next=` in the URL; the OAuth round-trip cannot, so
  // its continuation waits in sessionStorage. Consumed unconditionally so a
  // stale stash never outlives one landing.
  const stashed = consumeOAuthNext()
  return {
    user: await getCurrentUser(),
    next: safeRedirectTo(params.get("next") ?? stashed),
  }
}

/**
 * Absolute URL for the auth landing route. Supabase requires an absolute
 * redirect, and it must match an allowlisted entry in the dashboard.
 */
function callbackUrl(next?: string): string {
  const path = next
    ? `/auth/callback?next=${encodeURIComponent(next)}`
    : "/auth/callback"
  if (typeof window === "undefined") return path
  return new URL(path, window.location.origin).toString()
}

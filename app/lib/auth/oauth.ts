import { configureWeb } from "@exegia/plugin-supabase-auth/web"
import { authActions, resolveMessage } from "@exegia/use-auth"
import { getSupabase } from "@/lib/supabase"
import { DEFAULT_AUTHENTICATED_PATH } from "./constants"
import { authErrorIn, getCurrentUser, safeRedirectTo } from "./session"
import { AuthError, type AuthProvider, type SessionUser } from "./types"

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
export function ensureAuthBindings(): void {
  if (authBindingsConfigured) return
  configureWeb({ client: getSupabase().auth })
  authBindingsConfigured = true
}

/**
 * Fallback carrier for the post-sign-in destination.
 *
 * From plugin 0.10.0 the destination normally travels in the URL, as the
 * `?next=` on the `redirectTo` handed to GoTrue. This stash covers the case
 * where that does not arrive: `redirectTo` is honoured only if the URL is in
 * the project's Redirect URLs allow-list, and a rejected one is **not** an
 * error — GoTrue quietly falls back to the Site URL, landing on `/` with no
 * `?next=` at all. `completeAuthRedirect` prefers the URL and falls back here,
 * so a misconfigured allow-list costs the continuation rather than the
 * sign-in.
 *
 * sessionStorage is same-tab, same-origin, which is exactly the scope of a
 * redirect round-trip.
 */
export const OAUTH_NEXT_KEY = "corpora.oauth.next"

export function stashOAuthNext(next: string): void {
  try {
    if (next === DEFAULT_AUTHENTICATED_PATH) sessionStorage.removeItem(OAUTH_NEXT_KEY)
    else sessionStorage.setItem(OAUTH_NEXT_KEY, next)
  } catch {
    // Storage can be unavailable (private mode). Losing the continuation only
    // means landing on the default page after sign-in.
  }
}

export function consumeOAuthNext(): string | null {
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
 * Providers). The return leg is asked for explicitly via `redirectTo`, which
 * the binding has supported since plugin 0.10.0; GoTrue honours it only when
 * the URL is allow-listed, and otherwise falls back to the Site URL without
 * complaint — see the note on the sessionStorage stash above.
 */
export async function signInWithProvider(
  provider: AuthProvider,
  redirectTo?: string | null,
): Promise<void> {
  ensureAuthBindings()
  const next = safeRedirectTo(redirectTo)
  // Written before the redirect starts, and read only if `?next=` fails to
  // make the round-trip. Cheap insurance against a silent allow-list miss.
  stashOAuthNext(next)
  const result = await authActions.signInWithOAuth({
    provider,
    // Absolute, because GoTrue requires it and matches it against the
    // allow-list verbatim. Sending the app to /auth/callback rather than the
    // Site URL is what lets the destination ride along as `?next=`.
    redirectTo: callbackUrl(next),
  })
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
  // Read through the same key-tolerant helper the guard uses, so a failure
  // GoTrue reported without `error_description` surfaces as a failure here
  // rather than falling through to the "link has expired" message.
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""))
  const failure = authErrorIn(params) ?? authErrorIn(hash)
  if (failure) throw new AuthError(failure)

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
export function callbackUrl(next?: string): string {
  const path = next
    ? `/auth/callback?next=${encodeURIComponent(next)}`
    : "/auth/callback"
  if (typeof window === "undefined") return path
  return new URL(path, window.location.origin).toString()
}

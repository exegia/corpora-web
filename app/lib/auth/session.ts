import type { User } from "@supabase/supabase-js"
import { redirect } from "react-router"
import { getSupabase } from "@/lib/supabase"
import { AUTH_PATHS, DEFAULT_AUTHENTICATED_PATH, LOGIN_PATH } from "./constants"
import { AuthError, type SessionUser } from "./types"

// ---- Session -------------------------------------------------------------

export function toSessionUser(user: User): SessionUser {
  const meta = user.user_metadata ?? {}
  const name = meta.name ?? meta.full_name
  // `avatar_url` is ours (lib/profile); `picture` is what OAuth providers set.
  const avatar = meta.avatar_url ?? meta.picture
  return {
    id: user.id,
    email: user.email ?? "",
    name: typeof name === "string" && name.trim() ? name.trim() : null,
    avatarUrl: typeof avatar === "string" && avatar.trim() ? avatar.trim() : null,
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
 * Reads a GoTrue failure out of a set of params, whichever keys it used.
 *
 * `error_description` is the readable one, but it is not always present:
 * a rejected link carries it, while the 500 path behind a refused provider
 * credential need not. Falling back to the codes means an unfamiliar shape
 * still registers *as* a failure — the alternative is treating it as "no
 * error" and losing the reason exactly where it matters most.
 */
export function authErrorIn(params: URLSearchParams): string | null {
  const description = params.get("error_description")
  if (description) return description
  const code = params.get("error_code") ?? params.get("error")
  return code ? `Sign in failed (${code}).` : null
}

/**
 * A failed auth round-trip reports its reason in the URL *fragment*, which a
 * loader cannot see: `Request` drops the fragment, so `request.url` never
 * carries it. `window.location` is the only place it survives.
 *
 * The query is checked too because the PKCE flow puts errors there instead,
 * and that form *does* reach the loader.
 */
function authErrorInUrl(request: Request): string | null {
  const fromQuery = authErrorIn(new URL(request.url).searchParams)
  if (fromQuery) return fromQuery
  if (typeof window === "undefined") return null
  return authErrorIn(new URLSearchParams(window.location.hash.replace(/^#/, "")))
}

/**
 * Guard for authenticated routes. Throws a redirect to `/login`, carrying the
 * attempted location so the login screen can send the user back afterwards.
 */
export async function requireSession(request: Request): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (user) return user

  // A failed OAuth round-trip lands *here*, not on /auth/callback. The 0.9.0
  // web binding sends no `redirect_to`, so GoTrue returns the browser to the
  // project's Site URL — which in production is the app root, and the root is
  // guarded. Bouncing straight to /login would discard the provider's reason
  // and read as an unexplained flash back to the login screen; that is exactly
  // how a rejected Apple client secret presented in prod. Hand it to
  // /auth/callback instead, whose whole job is rendering this failure.
  const authError = authErrorInUrl(request)
  if (authError) {
    throw redirect(`/auth/callback?error_description=${encodeURIComponent(authError)}`)
  }

  // Neither the default landing nor the root (which only dispatches there)
  // is worth carrying as a redirectTo.
  const from = pathWithSearch(request)
  const search =
    from === DEFAULT_AUTHENTICATED_PATH || from === "/"
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

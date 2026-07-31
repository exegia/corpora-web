// Auth seam for the authentication UI.
//
// SCOPE: this is the *UI stage*. Nothing here talks to Supabase yet — the
// session lives in localStorage so the screens, the guards and the tests are
// all exercisable end to end. Every function below is the exact shape the
// Supabase implementation will have, so wiring it up later is a change to this
// file only; no route module or component should need to move.
//
// Route modules import ONLY from this module.
//
// When the real implementation lands, see `docs/auth.md` — signing in flips
// the Postgres role from `anon` to `authenticated`, and four tables currently
// carry `for all to anon` policies that would silently return zero rows.

import { redirect } from "react-router"

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

export type AuthProvider = "google" | "apple" | "github" | "x"

/** Paths served by the auth layout — never a valid post-login destination. */
export const AUTH_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify",
] as const

export const LOGIN_PATH = "/login"
export const DEFAULT_AUTHENTICATED_PATH = "/"

const STORAGE_KEY = "corpora.auth.session"

/**
 * Stand-in credential rules, chosen so every state in the blocks is reachable
 * by hand: any well-formed email signs in, except this one, which always
 * fails — that is how you demo the error shake without a backend.
 */
export const REJECTED_EMAIL = "locked@corpora.local"

/** Stand-in verification code accepted by `/verify`. */
export const DEMO_CODE = "123456"

// ---- Session storage -----------------------------------------------------

function readStoredSession(): SessionUser | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SessionUser>
    if (typeof parsed?.id !== "string" || typeof parsed?.email !== "string") {
      return null
    }
    return {
      id: parsed.id,
      email: parsed.email,
      name: typeof parsed.name === "string" ? parsed.name : null,
      emailConfirmed: parsed.emailConfirmed !== false,
    }
  } catch {
    // A corrupt or unreadable store is indistinguishable from being signed
    // out, and treating it that way is the safe direction.
    return null
  }
}

function writeStoredSession(user: SessionUser | null): void {
  if (typeof window === "undefined") return
  try {
    if (user) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Private-mode quota failures must not break the flow.
  }
}

function makeUser(email: string, name?: string | null, emailConfirmed = true): SessionUser {
  return {
    id: `local-${email.trim().toLowerCase()}`,
    email: email.trim(),
    name: name?.trim() ? name.trim() : null,
    emailConfirmed,
  }
}

/** The signed-in user, or null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  return readStoredSession()
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
  const email = credentials.email.trim()
  if (email.toLowerCase() === REJECTED_EMAIL) {
    throw new AuthError("That email and password don't match an account.")
  }
  if (!credentials.password) {
    throw new AuthError("Enter your password to continue.")
  }
  const user = makeUser(email)
  writeStoredSession(user)
  return user
}

export interface SignUpResult {
  user: SessionUser
  /** True when the address has to be confirmed before the account is usable. */
  needsConfirmation: boolean
}

export async function signUpWithPassword(details: {
  name?: string
  email: string
  password: string
}): Promise<SignUpResult> {
  const email = details.email.trim()
  if (email.toLowerCase() === REJECTED_EMAIL) {
    throw new AuthError("An account with that email already exists.")
  }
  // Confirmation is on in the real flow, so signup hands off to /verify and
  // deliberately leaves no session behind.
  return { user: makeUser(email, details.name, false), needsConfirmation: true }
}

export async function signOut(): Promise<void> {
  writeStoredSession(null)
}

// ---- Password recovery ---------------------------------------------------

export async function sendPasswordReset(email: string): Promise<void> {
  if (email.trim().toLowerCase() === REJECTED_EMAIL) {
    throw new AuthError("We couldn't send a link to that address.")
  }
}

export async function updatePassword(password: string): Promise<void> {
  if (password.length < 8) {
    throw new AuthError("Passwords need at least 8 characters.")
  }
}

// ---- Email code / confirmation ------------------------------------------

/** Verifies the 6-digit signup code and starts the session. */
export async function verifySignupCode(
  email: string,
  code: string,
): Promise<SessionUser> {
  if (code !== DEMO_CODE) {
    throw new AuthError("That code is not valid. Check the email and try again.")
  }
  const user = makeUser(email)
  writeStoredSession(user)
  return user
}

export async function resendSignupConfirmation(email: string): Promise<void> {
  if (!email.trim()) throw new AuthError("We don't have an address to resend to.")
}

// ---- OAuth ---------------------------------------------------------------

/**
 * Stands in for the provider handshake. The real version redirects the whole
 * document and never resolves; this one signs a placeholder identity in so the
 * button's loading → success states are exercisable.
 */
export async function signInWithProvider(
  provider: AuthProvider,
  _redirectTo?: string | null,
): Promise<SessionUser> {
  const user = makeUser(`${provider}-user@corpora.local`, provider)
  writeStoredSession(user)
  return user
}

/**
 * Starts a recovery session, the way following an emailed reset link will.
 * Exists so `/reset-password` is reachable before the mail flow is wired.
 */
export async function startRecoverySession(email: string): Promise<SessionUser> {
  const user = makeUser(email)
  writeStoredSession(user)
  return user
}

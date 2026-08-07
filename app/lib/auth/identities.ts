import {
  getIdentities as webGetIdentities,
  isAuthError as isBindingAuthError,
  linkIdentity as webLinkIdentity,
  unlinkIdentity as webUnlinkIdentity,
} from "@exegia/plugin-supabase-auth/web"
import { resolveMessage } from "@exegia/use-auth"
import {
  callbackUrl,
  consumeOAuthNext,
  ensureAuthBindings,
  stashOAuthNext,
} from "./oauth"
import { AuthError, type AuthProvider, type Identity } from "./types"

/** Where a link round-trip drops the user back: the page that offers it. */
const LINK_RETURN_PATH = "/profile"

/**
 * The bindings reject with a structured error whose `kind` maps to a
 * user-facing message; anything else gets this module's fallback phrasing.
 */
function toThrowableAuthError(cause: unknown, fallback: string): AuthError {
  if (isBindingAuthError(cause)) return new AuthError(resolveMessage(cause))
  if (cause instanceof Error && cause.message) return new AuthError(cause.message)
  return new AuthError(fallback)
}

/**
 * The sign-in identities attached to the current account — the email/password
 * one included, which is how callers can tell "last social identity" apart
 * from "last way into the account".
 */
export async function listIdentities(): Promise<Identity[]> {
  ensureAuthBindings()
  try {
    return await webGetIdentities()
  } catch (cause) {
    throw toThrowableAuthError(cause, "Unable to load your connected accounts.")
  }
}

/**
 * Attaches a provider identity to the *current* account. Same navigation
 * caveat as `signInWithProvider`: on success the whole document leaves for the
 * provider and this promise never settles here — the round-trip lands on
 * `/auth/callback`, which forwards to `/profile`. It rejects only when the
 * redirect could not start (provider disabled, manual linking off, …).
 *
 * Requires "manual linking" to be enabled on the Supabase project
 * (Authentication → Providers → Allow manual linking).
 */
export async function linkProvider(provider: AuthProvider): Promise<void> {
  ensureAuthBindings()
  // Same insurance as signInWithProvider: if the allow-list rejects
  // `redirectTo`, GoTrue falls back to the Site URL and the `?next=` is lost.
  stashOAuthNext(LINK_RETURN_PATH)
  try {
    await webLinkIdentity({
      provider,
      redirectTo: callbackUrl(LINK_RETURN_PATH),
    })
  } catch (cause) {
    consumeOAuthNext()
    throw toThrowableAuthError(cause, "Unable to connect that account.")
  }
}

/**
 * Disconnects one identity by its row key and resolves with the refreshed
 * list. GoTrue itself refuses to remove the account's only identity; the UI
 * guards that case up front, and this surfaces the server's message if a stale
 * view lets one through.
 */
export async function unlinkProvider(identityId: string): Promise<Identity[]> {
  ensureAuthBindings()
  try {
    return await webUnlinkIdentity({ identityId })
  } catch (cause) {
    throw toThrowableAuthError(cause, "Unable to disconnect that account.")
  }
}

/**
 * Deletes the signed-in user's own account.
 *
 * NOT YET WIRED TO A BACKEND. Deleting a user requires the service_role key,
 * which cannot live in this app — it is a browser-only SPA, and `.env.example`
 * is explicit that no secret may carry a VITE_ prefix because there is no
 * server here to hold one. So this needs one of:
 *
 *   - a `delete_current_user()` Postgres function, SECURITY DEFINER, deleting
 *     from auth.users where id = auth.uid(), called through `.rpc()`; or
 *   - an Edge Function in ../corpora-supabase holding the service key.
 *
 * Until one exists this throws, and the confirm dialog renders the message
 * inline. It is deliberately a real failure rather than a silent no-op: a
 * delete that appears to succeed and does not is the worse outcome by far.
 * Swap the throw for the call and the rest of the flow is already in place.
 */
export async function deleteAccount(): Promise<void> {
  throw new AuthError(
    "Account deletion isn't available yet. Contact support and we'll remove it for you.",
  )
}

// Data-access layer for authentication (Supabase Auth).
//
// Route modules import ONLY from this module — never supabase-js directly,
// matching `lib/projects` and `lib/users`.
//
// The blocks in `@exegia/corpora-ui` surface a failure by *rejecting* the
// submit handler and rendering `error.message`, so every function here throws
// an `AuthError` whose message is already fit to show a user.

import type { Identity } from "@exegia/plugin-supabase-auth"
import type { Provider } from "@supabase/supabase-js"

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
  /** Portrait URL — set by the profile page, or by an OAuth provider. */
  avatarUrl: string | null
  emailConfirmed: boolean
}

export type AuthProvider = Provider

export type { Identity }

export interface SignUpResult {
  user: SessionUser | null
  /** True when the address must be confirmed before the account is usable. */
  needsConfirmation: boolean
}

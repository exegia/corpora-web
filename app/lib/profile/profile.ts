// Data-access layer for the researcher's persona profile, stored in Supabase
// auth `user_metadata` rather than a table: every field here is identity the
// user owns, none of it is queried across users, and RLS never needs to see it.
// Route modules import ONLY from the barrel (index.ts), never this submodule.

import { AuthError } from "@/lib/auth"
import { getSupabase } from "@/lib/supabase"
import type { Profile, ProfileUpdate } from "./types"
import { toProfile, toMetadata } from "./utils"

/**
 * The signed-in user's profile, read from the persisted session (no network
 * round-trip — same reasoning as `getCurrentUser` in lib/auth).
 */
export async function getProfile(): Promise<Profile> {
  const { data, error } = await getSupabase().auth.getSession()
  if (error) {
    throw new AuthError(
      `Could not read the session: ${error.message ?? "unexpected error"}`,
    )
  }
  const user = data.session?.user
  if (!user) throw new AuthError("You are signed out.")
  return toProfile(user.user_metadata ?? {})
}

/**
 * Persists the given fields to `user_metadata`. Empty strings clear a field.
 * Returns the profile as the server now has it.
 */
export async function updateProfile(update: ProfileUpdate): Promise<Profile> {
  const metadata = toMetadata(update)
  const { data, error } = await getSupabase().auth.updateUser({ data: metadata })
  if (error) {
    throw new AuthError(
      `Could not save your profile: ${error.message ?? "unexpected error"}`,
    )
  }
  return toProfile(data.user?.user_metadata ?? {})
}

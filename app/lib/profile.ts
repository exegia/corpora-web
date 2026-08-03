// The researcher's persona profile, stored in Supabase auth `user_metadata`
// rather than a table: every field here is identity the user owns,
// none of it is queried across users, and RLS never needs to see it.
// Route modules import ONLY from this module (same rule as lib/users).

import { AuthError } from "@/lib/auth"
import { getSupabase } from "@/lib/supabase"

/** What the researcher does with the corpora. First entry is the default. */
export const VOCATIONS = [
  "Scholar",
  "Translator",
  "Editor",
  "Philologist",
  "Linguist",
  "Historian",
  "Theologian",
  "Archivist",
  "Student",
  "Independent researcher",
] as const

/** The religious or scholarly tradition the researcher works within. */
export const TRADITIONS = [
  "Christianity",
  "Islam",
  "Judaism",
  "Buddhism",
  "Hinduism",
  "Jainism",
  "Daoism",
  "Zoroastrianism",
  "Greco-Roman antiquity",
  "Comparative / interfaith",
  "Secular",
] as const

export interface Profile {
  /** Full name, shown across Corpora. */
  name: string | null
  /** Handle used in mentions and links, without the `@`. */
  username: string | null
  /** Portrait image URL. The UI falls back to initials without one. */
  avatarUrl: string | null
  /** One of `VOCATIONS`, or a value written before the list existed. */
  vocation: string | null
  /** One of `TRADITIONS`, or a value written before the list existed. */
  tradition: string | null
  /** Working languages, freeform — e.g. "Latin, Koine Greek, Syriac". */
  languages: string | null
  /** Institution or society, e.g. "University of Tübingen". */
  affiliation: string | null
  /** Personal or academic site, without the scheme. */
  website: string | null
  /** Short profile summary. */
  bio: string | null
}

/** Everything the profile form can write. */
export type ProfileUpdate = Partial<Profile>

function asOptional(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function toProfile(metadata: Record<string, unknown>): Profile {
  return {
    // Password signups write `name`; OAuth providers write `full_name`.
    name: asOptional(metadata.name) ?? asOptional(metadata.full_name),
    username: asOptional(metadata.username),
    avatarUrl: asOptional(metadata.avatar_url),
    vocation: asOptional(metadata.vocation),
    tradition: asOptional(metadata.tradition),
    languages: asOptional(metadata.languages),
    affiliation: asOptional(metadata.affiliation),
    website: asOptional(metadata.website),
    bio: asOptional(metadata.bio),
  }
}

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
  const metadata: Record<string, string | null> = {}
  const write = (key: string, value: string | null | undefined) => {
    if (value !== undefined) metadata[key] = asOptional(value)
  }
  write("name", update.name)
  write("username", update.username)
  write("avatar_url", update.avatarUrl)
  write("vocation", update.vocation)
  write("tradition", update.tradition)
  write("languages", update.languages)
  write("affiliation", update.affiliation)
  write("website", update.website)
  write("bio", update.bio)

  const { data, error } = await getSupabase().auth.updateUser({ data: metadata })
  if (error) {
    throw new AuthError(
      `Could not save your profile: ${error.message ?? "unexpected error"}`,
    )
  }
  return toProfile(data.user?.user_metadata ?? {})
}

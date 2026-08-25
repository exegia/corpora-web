// Data-access layer for the seeded user directory (002, FR-018).
// Contract: specs/002-project-detail/contracts/data-access.md
// Read-only: reads `user_directory` (NOT `public.users`, which belongs to
// corpora-auth — research R4). Route modules import ONLY from this module.

import Project, { SUPERADMIN_EMAIL } from "@/lib/projects"
import { getSupabase } from "@/lib/supabase"

export interface DirectoryUser {
  id: string
  name: string | null
  username: string
  email: string
}

export async function listUsers(): Promise<DirectoryUser[]> {
  const { data, error } = await getSupabase()
    .from("user_directory")
    .select("id, name, username, email")
    .order("name", { ascending: true })
  if (error) {
    throw new Project.Errors.DataError(
      "unknown",
      `Could not load the user directory: ${error.message ?? "unexpected error"}`,
    )
  }
  return (data ?? []) as DirectoryUser[]
}

/**
 * The superadmin's directory row, or null when the directory has none.
 * Pre-auth (research R4) the session is treated as the superadmin whenever
 * this row exists; swap for the authenticated user once corpora-auth lands.
 */
export async function getSuperadmin(): Promise<DirectoryUser | null> {
  const { data, error } = await getSupabase()
    .from("user_directory")
    .select("id, name, username, email")
    .eq("email", SUPERADMIN_EMAIL)
    .maybeSingle()
  if (error) {
    throw new Project.Errors.DataError(
      "unknown",
      `Could not load the superadmin: ${error.message ?? "unexpected error"}`,
    )
  }
  return (data as DirectoryUser | null) ?? null
}

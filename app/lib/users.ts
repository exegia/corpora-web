// Data-access layer for the seeded user directory (002, FR-018).
// Contract: specs/002-project-detail/contracts/data-access.md
// Read-only: reads `user_directory` (NOT `public.users`, which belongs to
// corpora-auth — research R4). Route modules import ONLY from this module.

import { DataError } from "@/lib/projects"
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
    throw new DataError(
      "unknown",
      `Could not load the user directory: ${error.message ?? "unexpected error"}`,
    )
  }
  return (data ?? []) as DirectoryUser[]
}

// Read-only: reads `user_directory` (NOT `public.users`, which belongs to
// corpora-auth — research R4). Route modules import ONLY from the barrel
// (index.ts), never this submodule.

import { SUPERADMIN_EMAIL } from "@/lib/projects"
import { getSupabase } from "@/lib/supabase"
import { DIRECTORY_COLUMNS } from "./constants"
import type { DirectoryUser } from "./types"
import { fail } from "./utils"

export async function listUsers(): Promise<DirectoryUser[]> {
  const { data, error } = await getSupabase()
    .from("user_directory")
    .select(DIRECTORY_COLUMNS)
    .order("name", { ascending: true })
  if (error) fail("Could not load the user directory", error)
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
    .select(DIRECTORY_COLUMNS)
    .eq("email", SUPERADMIN_EMAIL)
    .maybeSingle()
  if (error) fail("Could not load the superadmin", error)
  return (data as DirectoryUser | null) ?? null
}

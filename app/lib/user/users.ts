// Read-only: reads `user_directory` (NOT `public.users`, which belongs to
// corpora-auth — research R4). Route modules import ONLY from the barrel
// (index.ts), never this submodule.

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

/** Resolve the signed-in actor's role from the trusted, session-checked database. */
export async function isCurrentSuperadmin(): Promise<boolean> {
  try {
    const { data, error } = await getSupabase().rpc("corpora_project_superadmin")
    return !error && data === true
  } catch {
    return false
  }
}

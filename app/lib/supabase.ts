import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

let client: SupabaseClient<Database> | null = null

/**
 * Lazily created singleton so importing this module never throws — the env
 * check runs on first use (and is bypassed entirely when tests mock this
 * module).
 */
export function getSupabase(): SupabaseClient<Database> {
  if (client) return client

  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (see .env.example)",
    )
  }

  client = createClient<Database>(url, key)
  return client
}

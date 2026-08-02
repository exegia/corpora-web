import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

let client: SupabaseClient<Database> | null = null

/** The prefix dotenvx leaves on any value it did not decrypt. */
const CIPHERTEXT_PREFIX = "encrypted:"

/**
 * A value that is set but unusable is worse than a missing one: it sails past
 * a truthiness check and surfaces later as an opaque library error during
 * render. The commonest cause is a build that skipped dotenvx and fell back to
 * the committed, still-encrypted `.env`.
 */
function assertDecrypted(name: string, value: string): void {
  if (value.startsWith(CIPHERTEXT_PREFIX)) {
    throw new Error(
      `${name} is still dotenvx ciphertext — the build ran without dotenvx and fell back to the committed .env. Set ${name} in the deployment environment (see .env.example).`,
    )
  }
}

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

  assertDecrypted("VITE_SUPABASE_URL", url)
  assertDecrypted("VITE_SUPABASE_PUBLISHABLE_KEY", key)

  // Checked here rather than left to createClient, so a misconfigured
  // deployment names the variable at fault instead of reporting
  // "Invalid supabaseUrl" from inside the library.
  let protocol: string
  try {
    protocol = new URL(url).protocol
  } catch {
    throw new Error(
      `VITE_SUPABASE_URL is not a valid URL: ${JSON.stringify(url.slice(0, 40))} (see .env.example)`,
    )
  }
  if (protocol !== "https:" && protocol !== "http:") {
    throw new Error(
      `VITE_SUPABASE_URL must be an http(s) URL, got ${JSON.stringify(protocol)} (see .env.example)`,
    )
  }

  client = createClient<Database>(url, key)
  return client
}

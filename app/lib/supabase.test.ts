import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// The module caches its client in module scope, so every case needs a fresh
// import to re-run the env check.
async function loadGetSupabase() {
  vi.resetModules()
  return (await import("@/lib/supabase")).getSupabase
}

describe("getSupabase env validation", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co")
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("builds a client when both values are present and well-formed", async () => {
    const getSupabase = await loadGetSupabase()
    expect(() => getSupabase()).not.toThrow()
  })

  it("names both variables when nothing is configured", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "")
    const getSupabase = await loadGetSupabase()
    expect(() => getSupabase()).toThrow(/Supabase is not configured/)
  })

  /**
   * The regression this file exists for: a Vercel build that skips dotenvx
   * falls back to the committed, still-encrypted `.env`. The value is truthy,
   * so it used to reach createClient and surface as "Invalid supabaseUrl"
   * during render, naming nothing.
   */
  it("reports undecrypted dotenvx ciphertext against the variable at fault", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "encrypted:BIOEefOQCoEXAMPLE")
    const getSupabase = await loadGetSupabase()
    expect(() => getSupabase()).toThrow(/VITE_SUPABASE_URL is still dotenvx ciphertext/)
  })

  it("catches ciphertext in the publishable key too", async () => {
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "encrypted:BPGTnWDl8XEXAMPLE")
    const getSupabase = await loadGetSupabase()
    expect(() => getSupabase()).toThrow(
      /VITE_SUPABASE_PUBLISHABLE_KEY is still dotenvx ciphertext/,
    )
  })

  it("rejects a URL that does not parse", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "ivaecofevxactmmupvyp.supabase.co")
    const getSupabase = await loadGetSupabase()
    expect(() => getSupabase()).toThrow(/VITE_SUPABASE_URL is not a valid URL/)
  })

  it("rejects a non-http protocol", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "ftp://example.supabase.co")
    const getSupabase = await loadGetSupabase()
    expect(() => getSupabase()).toThrow(/must be an http\(s\) URL/)
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createSkewTolerantFetch, JWT_ISSUED_AT_FUTURE } from "@/lib/supabase"

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

describe("createSkewTolerantFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function jsonResponse(status: number, body: unknown) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  }

  it("passes successful responses through unchanged", async () => {
    const native = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }))
    vi.stubGlobal("fetch", native)

    const wrapped = createSkewTolerantFetch(async () => "new-token")
    const res = await wrapped("https://example.test/rest/v1/users")

    expect(res.status).toBe(200)
    expect(native).toHaveBeenCalledTimes(1)
  })

  it("does not retry other 401s", async () => {
    const native = vi
      .fn()
      .mockResolvedValue(jsonResponse(401, { message: "JWT expired" }))
    vi.stubGlobal("fetch", native)
    const refresh = vi.fn().mockResolvedValue("new-token")

    const wrapped = createSkewTolerantFetch(refresh)
    const res = await wrapped("https://example.test/rest/v1/users")

    expect(res.status).toBe(401)
    expect(refresh).not.toHaveBeenCalled()
    expect(native).toHaveBeenCalledTimes(1)
  })

  it("refreshes once and replays on JWT issued at future", async () => {
    const native = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(401, { message: JWT_ISSUED_AT_FUTURE }),
      )
      .mockResolvedValueOnce(jsonResponse(200, [{ id: "1" }]))
    vi.stubGlobal("fetch", native)
    const refresh = vi.fn().mockResolvedValue("fresh-access-token")

    const wrapped = createSkewTolerantFetch(refresh)
    const res = await wrapped("https://example.test/rest/v1/user_directory", {
      headers: {
        Authorization: "Bearer stale",
        apikey: "pub",
      },
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([{ id: "1" }])
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(native).toHaveBeenCalledTimes(2)

    const retryInit = native.mock.calls[1][1] as RequestInit
    const retryHeaders = new Headers(retryInit.headers)
    expect(retryHeaders.get("Authorization")).toBe("Bearer fresh-access-token")
    expect(retryHeaders.get("apikey")).toBe("pub")
  })

  it("keeps replaying while the skew persists, then succeeds", async () => {
    // The cold-start case: the refreshed token carries the same fast client
    // clock, so the first replay fails the same way. The wrapper must not give
    // up after a single attempt.
    const native = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { message: JWT_ISSUED_AT_FUTURE }))
      .mockResolvedValueOnce(jsonResponse(401, { message: JWT_ISSUED_AT_FUTURE }))
      .mockResolvedValueOnce(jsonResponse(200, [{ id: "1" }]))
    vi.stubGlobal("fetch", native)
    const refresh = vi.fn().mockResolvedValue("fresh-access-token")

    const wrapped = createSkewTolerantFetch(refresh)
    const res = await wrapped("https://example.test/rest/v1/user_directory")

    expect(res.status).toBe(200)
    expect(native).toHaveBeenCalledTimes(3)
  })

  it("stops replaying after the bound and surfaces the last 401", async () => {
    const native = vi
      .fn()
      .mockResolvedValue(jsonResponse(401, { message: JWT_ISSUED_AT_FUTURE }))
    vi.stubGlobal("fetch", native)
    const refresh = vi.fn().mockResolvedValue("fresh-access-token")

    const wrapped = createSkewTolerantFetch(refresh)
    const res = await wrapped("https://example.test/rest/v1/user_directory")

    expect(res.status).toBe(401)
    // 1 initial + MAX_SKEW_RETRIES replays.
    expect(native).toHaveBeenCalledTimes(4)
  })

  it("returns the original 401 when refresh yields no token", async () => {
    const native = vi
      .fn()
      .mockResolvedValue(jsonResponse(401, { message: JWT_ISSUED_AT_FUTURE }))
    vi.stubGlobal("fetch", native)
    const refresh = vi.fn().mockResolvedValue(null)

    const wrapped = createSkewTolerantFetch(refresh)
    const res = await wrapped("https://example.test/rest/v1/users")

    expect(res.status).toBe(401)
    expect(refresh).toHaveBeenCalledTimes(1)
    // No replay when refresh fails.
    expect(native).toHaveBeenCalledTimes(1)
  })

  it("coalesces concurrent skew failures into one refresh", async () => {
    let resolveRefresh!: (token: string) => void
    const refreshDone = new Promise<string>((resolve) => {
      resolveRefresh = resolve
    })
    const refresh = vi.fn().mockReturnValue(refreshDone)

    const native = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(401, { message: JWT_ISSUED_AT_FUTURE }),
      )
      .mockResolvedValueOnce(
        jsonResponse(401, { message: JWT_ISSUED_AT_FUTURE }),
      )
      .mockResolvedValue(jsonResponse(200, { ok: true }))
    vi.stubGlobal("fetch", native)

    const wrapped = createSkewTolerantFetch(refresh)
    const a = wrapped("https://example.test/a")
    const b = wrapped("https://example.test/b")

    // Both first attempts must land on the shared refresh before we release it.
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))

    resolveRefresh("shared-token")
    const [resA, resB] = await Promise.all([a, b])
    expect(resA.status).toBe(200)
    expect(resB.status).toBe(200)
    expect(refresh).toHaveBeenCalledTimes(1)
  })
})

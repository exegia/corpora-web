import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  completeAuthRedirect,
  getCurrentUser,
  requireAnon,
  requireSession,
  safeRedirectTo,
  signInWithPassword,
  signInWithProvider,
  signUpWithPassword,
} from "@/lib/auth"

// The module under test reaches Supabase only through `getSupabase`, so the
// whole backend is one mock — same boundary `project.test.tsx` uses for
// `@/lib/projects`. Hoisted because `vi.mock` runs before the module body.
const { authApi } = vi.hoisted(() => ({
  authApi: {
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    verifyOtp: vi.fn(),
    resend: vi.fn(),
    signInWithOAuth: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    // The @exegia web bindings subscribe here while waiting for the OAuth
    // round-trip; on a full-page redirect the event never fires.
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: () => {} } },
    })),
  },
}))

vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({ auth: authApi }) }))

function supabaseUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "u-1",
    email: "ada@corpora.local",
    email_confirmed_at: "2026-08-01T00:00:00Z",
    user_metadata: { name: "Ada Researcher" },
    ...overrides,
  }
}

/** Puts a signed-in session behind `getSession`. */
function givenSignedIn(user = supabaseUser()) {
  authApi.getSession.mockResolvedValue({ data: { session: { user } }, error: null })
}

function givenSignedOut() {
  authApi.getSession.mockResolvedValue({ data: { session: null }, error: null })
}

function request(url: string): Request {
  return new Request(`https://corpora.test${url}`)
}

/** A thrown redirect is a Response; unwrap the Location it carries. */
async function locationOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run()
  } catch (thrown) {
    if (thrown instanceof Response) return thrown.headers.get("Location") ?? ""
    throw thrown
  }
  throw new Error("expected a redirect to be thrown")
}

beforeEach(() => {
  vi.clearAllMocks()
  givenSignedOut()
  sessionStorage.clear()
})

describe("safeRedirectTo", () => {
  it("keeps an in-app path", () => {
    expect(safeRedirectTo("/project/abc?tab=corpus")).toBe("/project/abc?tab=corpus")
  })

  it("falls back when there is no value", () => {
    expect(safeRedirectTo(null)).toBe("/")
    expect(safeRedirectTo("")).toBe("/")
  })

  it("refuses absolute and protocol-relative URLs", () => {
    expect(safeRedirectTo("https://evil.example/steal")).toBe("/")
    expect(safeRedirectTo("//evil.example")).toBe("/")
    expect(safeRedirectTo("/\\evil.example")).toBe("/")
  })

  // Without this the login screen would redirect to itself forever.
  it("refuses auth paths, which is what stops the /login → / → /login loop", () => {
    expect(safeRedirectTo("/login")).toBe("/")
    expect(safeRedirectTo("/signup?redirectTo=/login")).toBe("/")
    expect(safeRedirectTo("/auth/callback")).toBe("/")
  })
})

describe("getCurrentUser", () => {
  it("maps the Supabase user onto the app's shape", async () => {
    givenSignedIn()
    expect(await getCurrentUser()).toEqual({
      id: "u-1",
      email: "ada@corpora.local",
      name: "Ada Researcher",
      avatarUrl: null,
      emailConfirmed: true,
    })
  })

  it("reports an unconfirmed address and a missing name", async () => {
    givenSignedIn(
      supabaseUser({ email_confirmed_at: null, confirmed_at: null, user_metadata: {} }),
    )
    expect(await getCurrentUser()).toMatchObject({ name: null, emailConfirmed: false })
  })

  it("is null when signed out", async () => {
    expect(await getCurrentUser()).toBeNull()
  })

  it("reads the stored session rather than calling the network", async () => {
    givenSignedIn()
    await getCurrentUser()
    // A guard runs on every protected navigation; getUser() would make that a
    // round-trip each time.
    expect(authApi.getSession).toHaveBeenCalled()
  })
})

describe("requireSession", () => {
  it("redirects to /login with the attempted path when signed out", async () => {
    const location = await locationOf(() => requireSession(request("/project/abc")))
    expect(location).toBe(`/login?redirectTo=${encodeURIComponent("/project/abc")}`)
  })

  it("omits redirectTo when the attempted path is already the default", async () => {
    expect(await locationOf(() => requireSession(request("/")))).toBe("/login")
  })

  it("returns the user and throws nothing once signed in", async () => {
    givenSignedIn()
    await expect(requireSession(request("/project"))).resolves.toMatchObject({
      email: "ada@corpora.local",
    })
  })
})

describe("requireAnon", () => {
  it("lets a signed-out visitor through", async () => {
    await expect(requireAnon(request("/login"))).resolves.toBeNull()
  })

  it("sends a signed-in visitor to the app", async () => {
    givenSignedIn()
    expect(await locationOf(() => requireAnon(request("/login")))).toBe("/")
  })

  it("honours a vetted redirectTo", async () => {
    givenSignedIn()
    const location = await locationOf(() =>
      requireAnon(request("/login?redirectTo=%2Fcorpus")),
    )
    expect(location).toBe("/corpus")
  })

  it("discards a redirectTo pointing off-site", async () => {
    givenSignedIn()
    const location = await locationOf(() =>
      requireAnon(request("/login?redirectTo=https%3A%2F%2Fevil.example")),
    )
    expect(location).toBe("/")
  })
})

describe("signInWithPassword", () => {
  it("returns the signed-in user", async () => {
    authApi.signInWithPassword.mockResolvedValue({
      data: { user: supabaseUser() },
      error: null,
    })
    await expect(
      signInWithPassword({ email: " ada@corpora.local ", password: "hunter22" }),
    ).resolves.toMatchObject({ email: "ada@corpora.local" })
    // Trimmed before it reaches Supabase — a trailing space is a typo, not a
    // different account.
    expect(authApi.signInWithPassword).toHaveBeenCalledWith({
      email: "ada@corpora.local",
      password: "hunter22",
    })
  })

  it("rephrases Supabase's deliberately vague credential error", async () => {
    authApi.signInWithPassword.mockResolvedValue({
      data: {},
      error: { message: "Invalid login credentials" },
    })
    await expect(
      signInWithPassword({ email: "ada@corpora.local", password: "wrong" }),
    ).rejects.toThrow(/don't match an account/i)
  })

  it("passes any other failure through as-is", async () => {
    authApi.signInWithPassword.mockResolvedValue({
      data: {},
      error: { message: "Email not confirmed" },
    })
    await expect(
      signInWithPassword({ email: "ada@corpora.local", password: "hunter22" }),
    ).rejects.toThrow("Email not confirmed")
  })
})

describe("signUpWithPassword", () => {
  it("reports that confirmation is needed when no session comes back", async () => {
    authApi.signUp.mockResolvedValue({
      data: { user: supabaseUser(), session: null },
      error: null,
    })
    const result = await signUpWithPassword({
      name: "Ada Researcher",
      email: "ada@corpora.local",
      password: "Hunter22!x",
    })
    expect(result.needsConfirmation).toBe(true)
    expect(result.user).toMatchObject({ email: "ada@corpora.local" })
  })

  it("reports no confirmation needed when a session comes back", async () => {
    authApi.signUp.mockResolvedValue({
      data: { user: supabaseUser(), session: { user: supabaseUser() } },
      error: null,
    })
    const result = await signUpWithPassword({
      email: "ada@corpora.local",
      password: "Hunter22!x",
    })
    expect(result.needsConfirmation).toBe(false)
  })

  it("sends the display name as user metadata", async () => {
    authApi.signUp.mockResolvedValue({
      data: { user: supabaseUser(), session: null },
      error: null,
    })
    await signUpWithPassword({
      name: " Ada Researcher ",
      email: "ada@corpora.local",
      password: "Hunter22!x",
    })
    expect(authApi.signUp.mock.calls[0][0].options.data).toEqual({
      name: "Ada Researcher",
    })
  })
})

describe("completeAuthRedirect", () => {
  it("exchanges a PKCE code and reports where to go next", async () => {
    authApi.exchangeCodeForSession.mockResolvedValue({ error: null })
    givenSignedIn()

    const result = await completeAuthRedirect(
      "https://corpora.test/auth/callback?code=abc123&next=%2Fcorpus",
    )

    expect(authApi.exchangeCodeForSession).toHaveBeenCalledWith("abc123")
    expect(result.user).toMatchObject({ email: "ada@corpora.local" })
    expect(result.next).toBe("/corpus")
  })

  it("vets `next` the same way as every other redirect", async () => {
    givenSignedIn()
    const result = await completeAuthRedirect(
      "https://corpora.test/auth/callback?next=https%3A%2F%2Fevil.example",
    )
    expect(result.next).toBe("/")
  })

  it("surfaces an error carried in the query", async () => {
    await expect(
      completeAuthRedirect(
        "https://corpora.test/auth/callback?error_description=Email+link+is+invalid+or+has+expired",
      ),
    ).rejects.toThrow(/invalid or has expired/i)
  })

  // Implicit flow puts the failure in the fragment, where searchParams cannot
  // see it.
  it("surfaces an error carried in the fragment", async () => {
    await expect(
      completeAuthRedirect(
        "https://corpora.test/auth/callback#error=access_denied&error_description=Token+has+expired",
      ),
    ).rejects.toThrow(/token has expired/i)
  })

  it("returns a null user without a code when nothing signed in", async () => {
    const result = await completeAuthRedirect("https://corpora.test/auth/callback")
    expect(authApi.exchangeCodeForSession).not.toHaveBeenCalled()
    expect(result.user).toBeNull()
  })

  // The OAuth round-trip cannot carry `?next=` (the web bindings send no
  // redirect_to), so the destination waits in sessionStorage instead.
  it("falls back to the stashed OAuth destination when the URL has no next", async () => {
    givenSignedIn()
    sessionStorage.setItem("corpora.oauth.next", "/library")

    const result = await completeAuthRedirect(
      "https://corpora.test/auth/callback#access_token=abc",
    )

    expect(result.next).toBe("/library")
    // Consumed, not merely read — a stale stash must not outlive one landing.
    expect(sessionStorage.getItem("corpora.oauth.next")).toBeNull()
  })

  it("prefers an explicit ?next over the stash and still clears it", async () => {
    givenSignedIn()
    sessionStorage.setItem("corpora.oauth.next", "/library")

    const result = await completeAuthRedirect(
      "https://corpora.test/auth/callback?next=%2Fcorpus",
    )

    expect(result.next).toBe("/corpus")
    expect(sessionStorage.getItem("corpora.oauth.next")).toBeNull()
  })
})

describe("signInWithProvider", () => {
  it("starts the redirect through the shared client and stays pending", async () => {
    authApi.signInWithOAuth.mockResolvedValue({
      data: { provider: "google", url: "https://accounts.google.com/o/oauth2/auth" },
      error: null,
    })

    const attempt = signInWithProvider("google", "/library")

    // On the web the document navigates away, so success never settles here —
    // pending is the contract, not a hang.
    const outcome = await Promise.race([
      attempt.then(
        () => "settled",
        () => "settled",
      ),
      new Promise((resolve) => setTimeout(() => resolve("pending"), 50)),
    ])
    expect(outcome).toBe("pending")
    expect(authApi.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "google" }),
    )
    // The continuation is stashed for /auth/callback to consume after landing.
    expect(sessionStorage.getItem("corpora.oauth.next")).toBe("/library")
  })

  it("rejects with the auth kit's message when the provider is misconfigured", async () => {
    // Shaped like an auth-js AuthApiError: the bindings classify it by code
    // into kind `configuration`, and resolveMessage supplies the user copy.
    authApi.signInWithOAuth.mockResolvedValue({
      data: { provider: "google", url: null },
      error: {
        __isAuthError: true,
        name: "AuthApiError",
        code: "provider_disabled",
        status: 400,
        message: "provider is not enabled",
      },
    })

    await expect(signInWithProvider("google", "/library")).rejects.toThrow(
      "Authentication isn't configured correctly. Please contact the app developer.",
    )
    // A failed start must not leave a stale continuation behind.
    expect(sessionStorage.getItem("corpora.oauth.next")).toBeNull()
  })
})

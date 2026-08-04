import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  completeAuthRedirect,
  getCurrentUser,
  linkProvider,
  listIdentities,
  requireAnon,
  requireSession,
  safeRedirectTo,
  signInWithPassword,
  signInWithProvider,
  signUpWithPassword,
  unlinkProvider,
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
    getUserIdentities: vi.fn(),
    linkIdentity: vi.fn(),
    unlinkIdentity: vi.fn(),
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
  // The guards read the fragment off `window.location`, which persists between
  // tests in jsdom.
  window.location.hash = ""
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

  // A failed OAuth round-trip comes back to the Site URL — the app root, which
  // this guard protects — with the reason in the fragment. Bouncing to /login
  // would drop it, which is what made a rejected Apple client secret look like
  // an unexplained flash back to the login screen.
  it("hands a failed provider round-trip to /auth/callback instead of /login", async () => {
    window.location.hash =
      "#error=server_error&error_description=Unable+to+exchange+external+code"
    expect(await locationOf(() => requireSession(request("/")))).toBe(
      `/auth/callback?error_description=${encodeURIComponent("Unable to exchange external code")}`,
    )
  })

  // PKCE reports the failure in the query, where the loader can already see it.
  it("also catches a failure reported in the query", async () => {
    expect(
      await locationOf(() =>
        requireSession(request("/?error_description=Invalid+client")),
      ),
    ).toBe(`/auth/callback?error_description=${encodeURIComponent("Invalid client")}`)
  })

  // The failure that motivated this is GoTrue's 500 path, not the 4xx one, and
  // it need not carry the readable key. Recognising the codes is what stops an
  // unfamiliar shape from silently bouncing to /login again.
  it("still recognises a failure that carries no error_description", async () => {
    window.location.hash = "#error=server_error&error_code=unexpected_failure"
    expect(await locationOf(() => requireSession(request("/")))).toBe(
      `/auth/callback?error_description=${encodeURIComponent("Sign in failed (unexpected_failure).")}`,
    )
  })

  // Without this the guard would send every signed-out visitor to the error
  // card once any stray fragment was in the URL.
  it("still bounces to /login when the fragment is not an auth failure", async () => {
    window.location.hash = "#section-two"
    expect(await locationOf(() => requireSession(request("/")))).toBe("/login")
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
    // The stash is still written, but it is now the fallback rather than the
    // carrier — GoTrue ignores an allow-list miss silently, and this is what
    // keeps the continuation alive when `?next=` never arrives.
    expect(sessionStorage.getItem("corpora.oauth.next")).toBe("/library")
  })

  // The point of the 0.10.0 bindings: the destination rides in the URL, so the
  // round-trip comes back to /auth/callback instead of the Site URL and the
  // continuation no longer depends on same-tab storage surviving.
  it("asks GoTrue to return to /auth/callback carrying the destination", async () => {
    authApi.signInWithOAuth.mockResolvedValue({
      data: { provider: "google", url: "https://accounts.google.com/o/oauth2/auth" },
      error: null,
    })

    void signInWithProvider("google", "/project/abc?tab=corpus")
    await vi.waitFor(() => expect(authApi.signInWithOAuth).toHaveBeenCalled())

    const { options } = authApi.signInWithOAuth.mock.calls[0][0]
    // Absolute, because GoTrue matches it against the allow-list verbatim.
    expect(options.redirectTo).toBe(
      `${window.location.origin}/auth/callback?next=${encodeURIComponent("/project/abc?tab=corpus")}`,
    )
  })

  // An off-site redirectTo must not become the landing page — that would be an
  // open redirect wearing the callback's clothes.
  it("vets the destination before it travels", async () => {
    authApi.signInWithOAuth.mockResolvedValue({
      data: { provider: "google", url: "https://accounts.google.com/o/oauth2/auth" },
      error: null,
    })

    void signInWithProvider("google", "https://evil.example/steal")
    await vi.waitFor(() => expect(authApi.signInWithOAuth).toHaveBeenCalled())

    const { options } = authApi.signInWithOAuth.mock.calls[0][0]
    expect(options.redirectTo).toBe(
      `${window.location.origin}/auth/callback?next=${encodeURIComponent("/")}`,
    )
    expect(options.redirectTo).not.toContain("evil.example")
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

// GoTrue's snake_case identity rows, as `getUserIdentities` returns them.
const EMAIL_IDENTITY = {
  identity_id: "row-email",
  id: "u-1",
  provider: "email",
  identity_data: { email: "ada@corpora.local" },
  created_at: "2026-07-01T00:00:00Z",
  last_sign_in_at: "2026-08-01T00:00:00Z",
}

const GOOGLE_IDENTITY = {
  identity_id: "row-google",
  id: "google-sub-1",
  provider: "google",
  identity_data: { email: "ada@gmail.example" },
  created_at: "2026-08-02T00:00:00Z",
  last_sign_in_at: null,
}

describe("listIdentities", () => {
  it("maps GoTrue's rows onto the app shape, email identity included", async () => {
    authApi.getUserIdentities.mockResolvedValue({
      data: { identities: [EMAIL_IDENTITY, GOOGLE_IDENTITY] },
      error: null,
    })

    const list = await listIdentities()

    // The email identity stays in the list: it is what tells "last social
    // identity" apart from "last way into the account".
    expect(list).toEqual([
      expect.objectContaining({
        identityId: "row-email",
        provider: "email",
        email: "ada@corpora.local",
      }),
      expect.objectContaining({
        identityId: "row-google",
        provider: "google",
        email: "ada@gmail.example",
      }),
    ])
  })

  it("throws an AuthError instead of leaking the binding's rejection", async () => {
    authApi.getUserIdentities.mockResolvedValue({
      data: null,
      error: {
        __isAuthError: true,
        name: "AuthSessionMissingError",
        status: 400,
        message: "session missing",
      },
    })

    await expect(listIdentities()).rejects.toThrow(
      "Your session has expired. Please sign in again.",
    )
  })
})

describe("linkProvider", () => {
  it("starts the link redirect back to /profile and stays pending", async () => {
    authApi.linkIdentity.mockResolvedValue({
      data: { provider: "google", url: "https://accounts.google.com/o/oauth2/auth" },
      error: null,
    })

    const attempt = linkProvider("google")

    // As with signInWithProvider: the document navigates away on success, so
    // pending is the contract, not a hang.
    const outcome = await Promise.race([
      attempt.then(
        () => "settled",
        () => "settled",
      ),
      new Promise((resolve) => setTimeout(() => resolve("pending"), 50)),
    ])
    expect(outcome).toBe("pending")

    const { provider, options } = authApi.linkIdentity.mock.calls[0][0]
    expect(provider).toBe("google")
    expect(options.redirectTo).toBe(
      `${window.location.origin}/auth/callback?next=${encodeURIComponent("/profile")}`,
    )
    // The fallback stash, for when the allow-list quietly drops `?next=`.
    expect(sessionStorage.getItem("corpora.oauth.next")).toBe("/profile")
  })

  it("rejects with the auth kit's message when manual linking is disabled", async () => {
    authApi.linkIdentity.mockResolvedValue({
      data: { provider: "google", url: null },
      error: {
        __isAuthError: true,
        name: "AuthApiError",
        code: "manual_linking_disabled",
        status: 400,
        message: "Manual linking is disabled",
      },
    })

    await expect(linkProvider("google")).rejects.toThrow(
      "Authentication isn't configured correctly. Please contact the app developer.",
    )
    // A failed start must not leave a stale continuation behind.
    expect(sessionStorage.getItem("corpora.oauth.next")).toBeNull()
  })
})

describe("unlinkProvider", () => {
  it("disconnects by row key and resolves with the refreshed list", async () => {
    authApi.getUserIdentities
      .mockResolvedValueOnce({
        data: { identities: [EMAIL_IDENTITY, GOOGLE_IDENTITY] },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { identities: [EMAIL_IDENTITY] },
        error: null,
      })
    authApi.unlinkIdentity.mockResolvedValue({ data: {}, error: null })

    const list = await unlinkProvider("row-google")

    // auth-js unlinks by the full identity row, so the binding resolves the
    // row key to the row first.
    expect(authApi.unlinkIdentity).toHaveBeenCalledWith(
      expect.objectContaining({ identity_id: "row-google" }),
    )
    expect(list).toEqual([
      expect.objectContaining({ identityId: "row-email", provider: "email" }),
    ])
  })

  it("maps GoTrue's last-identity refusal to the user-facing message", async () => {
    authApi.getUserIdentities.mockResolvedValue({
      data: { identities: [GOOGLE_IDENTITY] },
      error: null,
    })
    authApi.unlinkIdentity.mockResolvedValue({
      data: null,
      error: {
        __isAuthError: true,
        name: "AuthApiError",
        code: "single_identity_not_deletable",
        status: 422,
        message: "User must have at least 1 identity after unlinking",
      },
    })

    await expect(unlinkProvider("row-google")).rejects.toThrow(
      "This is the only way to sign in to this account, so it can't be disconnected.",
    )
  })
})

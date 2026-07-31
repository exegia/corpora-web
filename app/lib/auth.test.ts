import { beforeEach, describe, expect, it } from "vitest"
import {
  DEMO_CODE,
  getCurrentUser,
  REJECTED_EMAIL,
  requireAnon,
  requireSession,
  safeRedirectTo,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  verifySignupCode,
} from "@/lib/auth"

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
  window.localStorage.clear()
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
    expect(safeRedirectTo("/reset-password")).toBe("/")
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
    await signInWithPassword({ email: "ada@corpora.local", password: "hunter22" })
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
    await signInWithPassword({ email: "ada@corpora.local", password: "hunter22" })
    expect(await locationOf(() => requireAnon(request("/login")))).toBe("/")
  })

  it("honours a vetted redirectTo", async () => {
    await signInWithPassword({ email: "ada@corpora.local", password: "hunter22" })
    const location = await locationOf(() =>
      requireAnon(request("/login?redirectTo=%2Fcorpus")),
    )
    expect(location).toBe("/corpus")
  })

  it("discards a redirectTo pointing off-site", async () => {
    await signInWithPassword({ email: "ada@corpora.local", password: "hunter22" })
    const location = await locationOf(() =>
      requireAnon(request("/login?redirectTo=https%3A%2F%2Fevil.example")),
    )
    expect(location).toBe("/")
  })
})

describe("session lifecycle", () => {
  it("persists across reads and clears on sign out", async () => {
    await signInWithPassword({ email: "ada@corpora.local", password: "hunter22" })
    expect(await getCurrentUser()).toMatchObject({ email: "ada@corpora.local" })
    await signOut()
    expect(await getCurrentUser()).toBeNull()
  })

  it("surfaces a failure for the rejected address", async () => {
    await expect(
      signInWithPassword({ email: REJECTED_EMAIL, password: "hunter22" }),
    ).rejects.toThrow(/don't match an account/i)
    expect(await getCurrentUser()).toBeNull()
  })

  it("signs up without a session, since the address needs confirming", async () => {
    const result = await signUpWithPassword({
      name: "Ada Researcher",
      email: "ada@corpora.local",
      password: "hunter22!",
    })
    expect(result.needsConfirmation).toBe(true)
    expect(await getCurrentUser()).toBeNull()
  })

  it("starts the session only once the code verifies", async () => {
    await expect(verifySignupCode("ada@corpora.local", "000000")).rejects.toThrow(
      /not valid/i,
    )
    expect(await getCurrentUser()).toBeNull()

    await verifySignupCode("ada@corpora.local", DEMO_CODE)
    expect(await getCurrentUser()).toMatchObject({ email: "ada@corpora.local" })
  })

  it("treats a corrupt store as signed out rather than throwing", async () => {
    window.localStorage.setItem("corpora.auth.session", "{not json")
    expect(await getCurrentUser()).toBeNull()
  })
})

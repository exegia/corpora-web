import { beforeEach, describe, expect, it, vi } from "vitest"
import Profile from "@/lib/profile"

// Same one-mock boundary as auth.test.ts: the module reaches Supabase only
// through `getSupabase`.
const { authApi } = vi.hoisted(() => ({
  authApi: {
    getSession: vi.fn(),
    updateUser: vi.fn(),
  },
}))

vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({ auth: authApi }) }))

function givenMetadata(user_metadata: Record<string, unknown>) {
  authApi.getSession.mockResolvedValue({
    data: { session: { user: { id: "u-1", user_metadata } } },
    error: null,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getProfile", () => {
  it("maps user_metadata onto the persona fields", async () => {
    givenMetadata({
      name: "Ada Researcher",
      username: "ada",
      vocation: "Translator",
      tradition: "Christianity",
      languages: "Latin, Koine Greek",
      affiliation: "University of Tübingen",
      website: "ada.example.org",
      bio: "Working on the Vulgate.",
      avatar_url: "https://img.example/ada.png",
    })

    await expect(Profile.GetSet.getProfile()).resolves.toEqual({
      name: "Ada Researcher",
      username: "ada",
      vocation: "Translator",
      tradition: "Christianity",
      languages: "Latin, Koine Greek",
      affiliation: "University of Tübingen",
      website: "ada.example.org",
      bio: "Working on the Vulgate.",
      avatarUrl: "https://img.example/ada.png",
    })
  })

  it("falls back to the OAuth full_name and nulls blank fields", async () => {
    givenMetadata({ full_name: "Ada Lovelace", username: "   " })

    const profile = await Profile.GetSet.getProfile()
    expect(profile.name).toBe("Ada Lovelace")
    expect(profile.username).toBeNull()
    expect(profile.vocation).toBeNull()
  })

  it("rejects when signed out", async () => {
    authApi.getSession.mockResolvedValue({ data: { session: null }, error: null })
    await expect(Profile.GetSet.getProfile()).rejects.toThrow(/signed out/i)
  })
})

describe("updateProfile", () => {
  it("writes only the given fields, trimming and clearing empties", async () => {
    authApi.updateUser.mockResolvedValue({
      data: { user: { user_metadata: { name: "Ada", website: null } } },
      error: null,
    })

    await Profile.GetSet.updateProfile({ name: "  Ada  ", website: "" })

    expect(authApi.updateUser).toHaveBeenCalledWith({
      data: { name: "Ada", website: null },
    })
    // No unrelated keys — a partial update must not blank the rest.
    const written = authApi.updateUser.mock.calls[0][0].data
    expect(Object.keys(written)).toEqual(["name", "website"])
  })

  it("surfaces the backend error message", async () => {
    authApi.updateUser.mockResolvedValue({
      data: { user: null },
      error: { message: "over quota" },
    })
    await expect(Profile.GetSet.updateProfile({ bio: "x" })).rejects.toThrow(/over quota/)
  })
})

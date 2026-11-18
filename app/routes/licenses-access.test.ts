import { beforeEach, describe, expect, it, vi } from "vitest"
import Licences from "@/lib/licenses"
import User from "@/lib/user"
import { clientAction as catalogAction, clientLoader as catalogLoader } from "@/routes/licenses"
import { clientAction as detailAction, clientLoader as detailLoader } from "@/routes/licenses.$licenceId"

vi.mock("@/lib/user", () => ({
  default: { isCurrentSuperadmin: vi.fn() },
}))
vi.mock("@/lib/licenses", async (original) => {
  const actual = await original<typeof import("@/lib/licenses")>()
  return {
    ...actual,
    default: {
      ...actual.default,
      Catalog: { listLicences: vi.fn(), getLicence: vi.fn() },
      Authoring: { createLicence: vi.fn(), updateLicence: vi.fn() },
      Text: { resolveLicenceText: vi.fn(), saveLicenceText: vi.fn() },
    },
  }
})

function actionArgs(intent: string) {
  const form = new FormData()
  form.set("intent", intent)
  return { request: new Request("https://example.org/", { method: "POST", body: form }), params: { licenceId: "MIT" } } as never
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(Licences.Catalog.listLicences).mockResolvedValue([])
  vi.mocked(Licences.Catalog.getLicence).mockResolvedValue(null)
  vi.mocked(Licences.Text.resolveLicenceText).mockResolvedValue(null)
})

describe("licence catalogue permissions", () => {
  it.each([true, false])("exposes editor controls only for trusted role %s", async (allowed) => {
    vi.mocked(User.isCurrentSuperadmin).mockResolvedValue(allowed)
    expect((await (await catalogLoader()).data).superadmin).toBe(allowed)
    expect((await detailLoader({ params: { licenceId: "MIT" } } as never)).superadmin).toBe(allowed)
  })

  it.each(["update-licence", "save-licence-text"])("rejects a nonadmin %s action", async (intent) => {
    vi.mocked(User.isCurrentSuperadmin).mockResolvedValue(false)
    expect(await detailAction(actionArgs(intent))).toMatchObject({ ok: false })
    expect(Licences.Authoring.updateLicence).not.toHaveBeenCalled()
    expect(Licences.Text.saveLicenceText).not.toHaveBeenCalled()
  })

  it("rejects catalogue creation by a nonadmin", async () => {
    vi.mocked(User.isCurrentSuperadmin).mockResolvedValue(false)
    expect(await catalogAction(actionArgs("create-licence"))).toMatchObject({ ok: false })
    expect(Licences.Authoring.createLicence).not.toHaveBeenCalled()
  })

  it("allows a verified superadmin to save licence text", async () => {
    vi.mocked(User.isCurrentSuperadmin).mockResolvedValue(true)
    expect(await detailAction(actionArgs("save-licence-text"))).toMatchObject({ ok: true })
    expect(Licences.Text.saveLicenceText).toHaveBeenCalledWith("MIT", "")
  })
})

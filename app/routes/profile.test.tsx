import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createRoutesStub } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import ProfileRoute, {
  clientAction as profileAction,
  clientLoader as profileLoader,
} from "@/routes/profile"

// Mocked at the Supabase boundary rather than at `@/lib/auth`, matching
// auth.test.tsx: the real data layer, the real @exegia web bindings and the
// real error mapping all run against a faked GoTrue client.
const { authApi } = vi.hoisted(() => ({
  authApi: {
    getSession: vi.fn(),
    updateUser: vi.fn(),
    getUserIdentities: vi.fn(),
    linkIdentity: vi.fn(),
    unlinkIdentity: vi.fn(),
    // The web bindings subscribe here while waiting for the link round-trip;
    // on a full-page redirect the event never fires.
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: () => {} } },
    })),
  },
}))

vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({ auth: authApi }) }))

const ADA = {
  id: "u-1",
  email: "ada@corpora.local",
  email_confirmed_at: "2026-08-01T00:00:00Z",
  user_metadata: { name: "Ada Researcher" },
}

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

const APPLE_IDENTITY = {
  identity_id: "row-apple",
  id: "apple-sub-1",
  provider: "apple",
  identity_data: { email: "ada@icloud.example" },
  created_at: "2026-08-03T00:00:00Z",
  last_sign_in_at: null,
}

/** Backs `getUserIdentities` with a mutable list so unlink + the loader's
 * revalidation both see the current state without call-order choreography. */
function givenIdentities(rows: Array<Record<string, unknown>>) {
  let current = [...rows]
  authApi.getUserIdentities.mockImplementation(async () => ({
    data: { identities: current },
    error: null,
  }))
  authApi.unlinkIdentity.mockImplementation(async (row: { identity_id: string }) => {
    current = current.filter((r) => r.identity_id !== row.identity_id)
    return { data: {}, error: null }
  })
}

function renderProfile() {
  const Stub = createRoutesStub([
    {
      path: "/profile",
      Component: ProfileRoute,
      HydrateFallback: () => null,
      // biome-ignore lint: route module functions match at runtime
      loader: profileLoader as never,
      action: profileAction as never,
    },
  ])
  return render(<Stub initialEntries={["/profile"]} />)
}

beforeEach(() => {
  vi.clearAllMocks()
  authApi.getSession.mockResolvedValue({
    data: { session: { user: ADA } },
    error: null,
  })
  authApi.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: () => {} } },
  })
  sessionStorage.clear()
})

describe("connected accounts", () => {
  it("lists the linked social identities and offers the rest", async () => {
    givenIdentities([EMAIL_IDENTITY, GOOGLE_IDENTITY])
    renderProfile()

    // Behind <Await>, so findBy — the card suspends while the form renders.
    expect(await screen.findByText("Google")).toBeInTheDocument()
    expect(screen.getByText("ada@gmail.example")).toBeInTheDocument()
    // Google is connected, so only Apple remains a connect candidate.
    expect(screen.getByRole("button", { name: "Connect Apple" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Connect Google" })).not.toBeInTheDocument()
    // The email identity is not a row here — it is managed by the email field.
    expect(screen.queryByText("ada@corpora.local", { selector: "li *" })).not.toBeInTheDocument()
  })

  it("starts the link round-trip asking to land back on /profile", async () => {
    givenIdentities([EMAIL_IDENTITY])
    // The document navigates away on success, so the call never settles; the
    // pending promise is what holds the button in its loading state.
    authApi.linkIdentity.mockReturnValue(new Promise(() => {}))
    renderProfile()
    const user = userEvent.setup()

    await user.click(await screen.findByRole("button", { name: "Connect Google" }))

    await waitFor(() => expect(authApi.linkIdentity).toHaveBeenCalled())
    const { provider, options } = authApi.linkIdentity.mock.calls[0][0]
    expect(provider).toBe("google")
    expect(options.redirectTo).toBe(
      `${window.location.origin}/auth/callback?next=${encodeURIComponent("/profile")}`,
    )
  })

  it("disconnects an identity and revalidates the list", async () => {
    givenIdentities([GOOGLE_IDENTITY, APPLE_IDENTITY])
    renderProfile()
    const user = userEvent.setup()

    await user.click(await screen.findByRole("button", { name: "Disconnect Google" }))

    await waitFor(() =>
      expect(authApi.unlinkIdentity).toHaveBeenCalledWith(
        expect.objectContaining({ identity_id: "row-google" }),
      ),
    )
    // The loader revalidated against the mutated list: the row is gone and
    // Google is offered as a connect candidate again.
    expect(await screen.findByRole("button", { name: "Connect Google" })).toBeInTheDocument()
    // The row leaves through AnimatePresence, so removal is not synchronous
    // with the data update.
    await waitFor(() =>
      expect(screen.queryByText("ada@gmail.example")).not.toBeInTheDocument(),
    )
  })

  it("lets an email-backed account disconnect its only social identity", async () => {
    // Email + one provider: the password keeps the account reachable, and
    // `hasOtherSignInMethods` tells the block so — the last-method guard
    // stays out of the way and the unlink goes through.
    givenIdentities([EMAIL_IDENTITY, GOOGLE_IDENTITY])
    renderProfile()
    const user = userEvent.setup()

    const disconnect = await screen.findByRole("button", { name: "Disconnect Google" })
    expect(disconnect).toBeEnabled()
    await user.click(disconnect)

    await waitFor(() =>
      expect(authApi.unlinkIdentity).toHaveBeenCalledWith(
        expect.objectContaining({ identity_id: "row-google" }),
      ),
    )
  })

  it("guards a lone social identity with no email fallback", async () => {
    // No email identity at all: the Google row really is the only way in,
    // so the guard must still hold.
    givenIdentities([GOOGLE_IDENTITY])
    renderProfile()

    const disconnect = await screen.findByRole("button", { name: "Disconnect Google" })
    expect(disconnect).toBeDisabled()
    expect(
      screen.getByText(/only way to sign in, so it can't be disconnected/i),
    ).toBeInTheDocument()
  })

  it("shows a load failure instead of an empty list", async () => {
    authApi.getUserIdentities.mockResolvedValue({
      data: null,
      error: {
        __isAuthError: true,
        name: "AuthRetryableFetchError",
        status: 0,
        message: "fetch failed",
      },
    })
    renderProfile()

    expect(
      await screen.findByText(/couldn't load your connected accounts/i),
    ).toBeInTheDocument()
    expect(screen.queryByText(/no sign-in methods connected yet/i)).not.toBeInTheDocument()
  })

  /**
   * The card is a Frame like every other panel on the page, and the pending,
   * loaded and failed states all have to be that *same* Frame — otherwise the
   * card visibly re-chromes when the deferred identities land. A screenshot
   * only ever catches the resolved state, so pin it here instead.
   */
  it("keeps the same frame while pending, once loaded, and on failure", async () => {
    /**
     * Anchored to the state's *own* content and walked upwards. Querying for
     * any `frame-panel-title` would pass on the strength of the Profile
     * Details frame alone and never notice this card losing its own.
     */
    const frameAround = (node: HTMLElement) => {
      const frame = node.closest("[data-slot=frame]")
      // Not just any Frame — the one whose header titles this card.
      const title = frame?.querySelector("[data-slot=frame-panel-title]")
      return title?.textContent === "Connected accounts" ? frame : null
    }

    // Pending: getUserIdentities never settles, so the Suspense fallback holds.
    authApi.getUserIdentities.mockReturnValue(new Promise(() => {}))
    const pending = renderProfile()
    const spinner = await screen.findByText(/loading connected accounts/i)
    expect(frameAround(spinner)).not.toBeNull()
    pending.unmount()

    givenIdentities([EMAIL_IDENTITY, GOOGLE_IDENTITY])
    const loaded = renderProfile()
    expect(frameAround(await screen.findByText("Google"))).not.toBeNull()
    // The block's own card chrome is stripped, so the Frame's panel is the
    // only surface — an intact auth-block card would double border and radius.
    expect(document.querySelector("[data-slot=auth-block]")).toHaveClass("border-0")
    loaded.unmount()

    authApi.getUserIdentities.mockResolvedValue({
      data: null,
      error: {
        __isAuthError: true,
        name: "AuthRetryableFetchError",
        status: 0,
        message: "fetch failed",
      },
    })
    renderProfile()
    const failure = await screen.findByText(/couldn't load your connected accounts/i)
    expect(frameAround(failure)).not.toBeNull()
  })
})

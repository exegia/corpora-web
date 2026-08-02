import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createRoutesStub } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import ForgotPasswordRoute, {
  clientLoader as forgotLoader,
} from "@/routes/forgot-password"
import LoginRoute, { clientLoader as loginLoader } from "@/routes/login"
import ProtectedLayout, {
  clientLoader as protectedLoader,
} from "@/routes/protected-layout"
import ResetPasswordRoute, { clientLoader as resetLoader } from "@/routes/reset-password"
import SignupRoute, { clientLoader as signupLoader } from "@/routes/signup"
import VerifyRoute from "@/routes/verify"

// Mocked at the Supabase boundary rather than at `@/lib/auth`, so the real
// guards, the real redirect vetting and the real error mapping all still run —
// these tests are about the routes wired to genuine auth logic, with only the
// network faked.
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
  },
}))

vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({ auth: authApi }) }))

const ADA = {
  id: "u-1",
  email: "ada@corpora.local",
  email_confirmed_at: "2026-08-01T00:00:00Z",
  user_metadata: { name: "Ada Researcher" },
}

function givenSignedIn() {
  authApi.getSession.mockResolvedValue({
    data: { session: { user: ADA } },
    error: null,
  })
}

function givenSignedOut() {
  authApi.getSession.mockResolvedValue({ data: { session: null }, error: null })
}

const nothing = () => null

/**
 * Every auth route is stubbed alongside a marker for the destinations it can
 * reach, so "did it navigate" is asserted on rendered output rather than on a
 * mocked navigate.
 */
function renderAuth(initialEntry: string) {
  const Stub = createRoutesStub([
    {
      path: "/login",
      Component: LoginRoute,
      HydrateFallback: nothing,
      // biome-ignore lint: route module functions match at runtime
      loader: loginLoader as never,
    },
    {
      path: "/signup",
      Component: SignupRoute,
      HydrateFallback: nothing,
      // biome-ignore lint: route module functions match at runtime
      loader: signupLoader as never,
    },
    {
      path: "/forgot-password",
      Component: ForgotPasswordRoute,
      HydrateFallback: nothing,
      // biome-ignore lint: route module functions match at runtime
      loader: forgotLoader as never,
    },
    {
      path: "/reset-password",
      Component: ResetPasswordRoute,
      HydrateFallback: nothing,
      // biome-ignore lint: route module functions match at runtime
      loader: resetLoader as never,
    },
    { path: "/verify", Component: VerifyRoute },
    { path: "/", Component: () => <h1>Dashboard</h1> },
    { path: "/corpus", Component: () => <h1>Corpus</h1> },
  ])
  return render(<Stub initialEntries={[initialEntry]} />)
}

beforeEach(() => {
  vi.clearAllMocks()
  givenSignedOut()
  // The happy path for each call the routes make; individual cases override.
  authApi.signInWithPassword.mockResolvedValue({ data: { user: ADA }, error: null })
  authApi.signUp.mockResolvedValue({ data: { user: ADA, session: null }, error: null })
  authApi.resetPasswordForEmail.mockResolvedValue({ error: null })
  authApi.updateUser.mockResolvedValue({ error: null })
  authApi.verifyOtp.mockResolvedValue({ data: { user: ADA }, error: null })
  authApi.signOut.mockResolvedValue({ error: null })
})

describe("/login", () => {
  it("reveals the password field only once the email is valid", async () => {
    const user = userEvent.setup()
    renderAuth("/login")

    expect(await screen.findByLabelText("Email")).toBeInTheDocument()
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument()

    await user.type(screen.getByLabelText("Email"), "ada@corpora.local")
    expect(await screen.findByLabelText("Password")).toBeInTheDocument()
  })

  it("signs in and lands on the dashboard", async () => {
    const user = userEvent.setup()
    renderAuth("/login")

    await user.type(await screen.findByLabelText("Email"), "ada@corpora.local")
    await user.type(await screen.findByLabelText("Password"), "hunter22")
    await user.click(screen.getByRole("button", { name: "Login" }))

    expect(
      await screen.findByRole("heading", { name: "Dashboard" }, { timeout: 3000 }),
    ).toBeInTheDocument()
  })

  it("returns to the page that bounced the user, not the dashboard", async () => {
    const user = userEvent.setup()
    renderAuth(`/login?redirectTo=${encodeURIComponent("/corpus")}`)

    await user.type(await screen.findByLabelText("Email"), "ada@corpora.local")
    await user.type(await screen.findByLabelText("Password"), "hunter22")
    await user.click(screen.getByRole("button", { name: "Login" }))

    expect(
      await screen.findByRole("heading", { name: "Corpus" }, { timeout: 3000 }),
    ).toBeInTheDocument()
  })

  it("shows the failure inline and stays put", async () => {
    // Supabase answers a wrong password and an unknown address identically, so
    // the form cannot be used to probe who has an account.
    authApi.signInWithPassword.mockResolvedValue({
      data: {},
      error: { message: "Invalid login credentials" },
    })
    const user = userEvent.setup()
    renderAuth("/login")

    await user.type(await screen.findByLabelText("Email"), "ada@corpora.local")
    await user.type(await screen.findByLabelText("Password"), "wrong")
    await user.click(screen.getByRole("button", { name: "Login" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(/don't match an account/i)
    expect(screen.queryByRole("heading", { name: "Dashboard" })).not.toBeInTheDocument()
  })

  it("bounces a signed-in visitor straight to the app", async () => {
    givenSignedIn()
    renderAuth("/login")

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument()
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument()
  })

  it("links across to signup, carrying the redirect", async () => {
    const user = userEvent.setup()
    renderAuth(`/login?redirectTo=${encodeURIComponent("/corpus")}`)

    await user.click(await screen.findByRole("button", { name: "Sign up" }))
    expect(await screen.findByLabelText("Email")).toBeInTheDocument()
    expect(await screen.findByRole("button", { name: "Login" })).toBeInTheDocument()
  })
})

describe("/signup", () => {
  it("hands off to the code screen instead of the app, since email needs confirming", async () => {
    const user = userEvent.setup()
    renderAuth("/signup")

    await user.type(await screen.findByLabelText("Name"), "Ada Researcher")
    await user.type(screen.getByLabelText("Email"), "ada@corpora.local")
    await user.type(await screen.findByPlaceholderText("Create a password"), "Hunter22!x")
    await user.click(await screen.findByRole("checkbox"))
    await user.click(await screen.findByRole("button", { name: /create account/i }))

    expect(
      await screen.findByText(/enter verification code/i, {}, { timeout: 3000 }),
    ).toBeInTheDocument()
    // The masked destination proves the email was carried across.
    expect(screen.getByText("a••@corpora.local")).toBeInTheDocument()
  })

  it("opens the terms in a dialog, leaving the half-filled form intact", async () => {
    const user = userEvent.setup()
    renderAuth("/signup")

    await user.type(await screen.findByLabelText("Name"), "Ada Researcher")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "terms" }))

    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveTextContent(/acceptance of terms/i)
    // The draft notice must stay until the copy has been through legal.
    expect(dialog).toHaveTextContent(/draft/i)

    await user.click(screen.getByRole("button", { name: "Close" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    // An open Base UI dialog aria-hides the rest of the app, so the form is
    // only assertable once it has closed (see docs/testing.md).
    expect(screen.getByLabelText("Name")).toHaveValue("Ada Researcher")
  })

  it("closing without agreeing leaves consent unticked", async () => {
    const user = userEvent.setup()
    renderAuth("/signup")

    await user.click(await screen.findByRole("button", { name: "terms" }))
    await user.click(await screen.findByRole("button", { name: "Close" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())

    // Base UI keeps the state on the role=checkbox element, not a native input.
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "false")
  })

  it("agreeing in the dialog ticks consent and unblocks submit", async () => {
    const user = userEvent.setup()
    renderAuth("/signup")

    await user.type(await screen.findByLabelText("Name"), "Ada Researcher")
    await user.type(screen.getByLabelText("Email"), "ada@corpora.local")
    await user.type(await screen.findByPlaceholderText("Create a password"), "Hunter22!x")

    await user.click(screen.getByRole("button", { name: "terms" }))
    await user.click(await screen.findByRole("button", { name: "I agree" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())

    // Consent came from the dialog, not from clicking the box — the whole
    // point of controlling it through `termsChecked`.
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "true")

    await user.click(screen.getByRole("button", { name: /create account/i }))
    expect(
      await screen.findByText(/enter verification code/i, {}, { timeout: 3000 }),
    ).toBeInTheDocument()
  })
})

describe("/forgot-password", () => {
  it("confirms the email was sent without navigating away", async () => {
    const user = userEvent.setup()
    renderAuth("/forgot-password")

    await user.type(await screen.findByLabelText("Email"), "ada@corpora.local")
    await user.click(screen.getByRole("button", { name: /send reset link/i }))

    expect(await screen.findByText(/check your (inbox|email)/i)).toBeInTheDocument()
  })
})

describe("/verify", () => {
  // Base UI leaves the first OTP slot unlabelled (it is the paste target), so
  // the slots are reached by role rather than by label.
  async function typeCode(user: ReturnType<typeof userEvent.setup>, code: string) {
    await screen.findByText(/verification code/i)
    await user.type(screen.getAllByRole("textbox")[0], code)
  }

  it("shows the masked address the code went to", async () => {
    renderAuth("/verify?email=ada%40corpora.local")
    expect(await screen.findByText("a••@corpora.local")).toBeInTheDocument()
  })

  it("rejects a wrong code", async () => {
    authApi.verifyOtp.mockResolvedValue({
      data: {},
      error: { message: "Token has expired or is invalid" },
    })
    const user = userEvent.setup()
    renderAuth("/verify?email=ada%40corpora.local")

    await typeCode(user, "000000")
    expect(await screen.findByRole("alert")).toHaveTextContent(/expired or is invalid/i)
    expect(screen.queryByRole("heading", { name: "Dashboard" })).not.toBeInTheDocument()
  })

  // Separate render, not a retry after the failure above: CodeAuthBlock keys
  // the OTP wrapper on the error message, so clearing the error on the first
  // keystroke remounts the field and drops the rest of the input. That is an
  // upstream quirk in the block, not something this route can work around.
  it("accepts the right code and lands on the dashboard", async () => {
    const user = userEvent.setup()
    renderAuth("/verify?email=ada%40corpora.local")

    await typeCode(user, "123456")
    expect(
      await screen.findByRole("heading", { name: "Dashboard" }, { timeout: 3000 }),
    ).toBeInTheDocument()
  })
})

describe("/reset-password", () => {
  it("tells the user the link expired when there is no recovery session", async () => {
    renderAuth("/reset-password")
    expect(await screen.findByText(/link has expired/i)).toBeInTheDocument()
  })

  // Following a recovery link signs the user in, so arriving here with a
  // session is the happy path, not a guard failure.
  it("updates the password once both fields agree", async () => {
    givenSignedIn()
    const user = userEvent.setup()
    renderAuth("/reset-password")

    await user.type(await screen.findByLabelText("New password"), "Hunter22!x")
    await user.type(await screen.findByLabelText("Confirm password"), "Hunter22!x")
    await user.click(screen.getByRole("button", { name: /update password/i }))

    expect(await screen.findByText(/password updated/i)).toBeInTheDocument()
  })
})

describe("route guards", () => {
  function renderProtected(initialEntry: string) {
    const Stub = createRoutesStub([
      {
        path: "/",
        Component: ProtectedLayout,
        HydrateFallback: nothing,
        // biome-ignore lint: route module functions match at runtime
        loader: protectedLoader as never,
        children: [
          { index: true, Component: () => <h1>Dashboard</h1> },
          { path: "corpus", Component: () => <h1>Corpus</h1> },
        ],
      },
      {
        path: "/login",
        Component: () => <h1>Login</h1>,
      },
    ])
    return render(<Stub initialEntries={[initialEntry]} />)
  }

  it("sends a signed-out visitor to /login", async () => {
    renderProtected("/corpus")
    expect(await screen.findByRole("heading", { name: "Login" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Corpus" })).not.toBeInTheDocument()
  })

  it("lets a signed-in visitor through to the route", async () => {
    givenSignedIn()
    renderProtected("/corpus")
    expect(await screen.findByRole("heading", { name: "Corpus" })).toBeInTheDocument()
  })

  it("shows the account menu for the signed-in user", async () => {
    givenSignedIn()
    renderProtected("/")

    // Labelled by the display name from `user_metadata`, falling back to the
    // address only when there is no name.
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /account menu for Ada Researcher/i }),
      ).toBeInTheDocument(),
    )
  })
})

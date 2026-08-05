import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createRoutesStub } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { formatRelativeTime } from "@/lib/format"
import {
  createProject,
  DataError,
  deleteProject,
  listProjects,
  type ProjectSummary,
} from "@/lib/projects"
import { listUsers } from "@/lib/users"
import ProjectRoute, { clientAction, clientLoader } from "@/routes/project"

vi.mock("@/lib/projects", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/projects")>()
  return {
    ...original,
    listProjects: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
  }
})

vi.mock("@/lib/users", () => ({ listUsers: vi.fn() }))

const summary: ProjectSummary = {
  id: "p1",
  name: "Peshitta Study",
  description: "Aramaic OT sources",
  status: "draft",
  type: null,
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-02T00:00:00Z",
}

const directoryUsers = [
  { id: "u1", name: "Ada Researcher", username: "ada", email: "ada@corpora.local" },
  { id: "u2", name: "Ben Scholar", username: "ben", email: "ben@corpora.local" },
]

function renderRoute() {
  const Stub = createRoutesStub([
    {
      path: "/project",
      Component: ProjectRoute,
      HydrateFallback: () => null,
      // biome-ignore lint: route module functions match at runtime
      loader: clientLoader as never,
      action: clientAction as never,
    },
    { path: "/project/:projectId", Component: () => <h1>Workspace</h1> },
  ])
  return render(<Stub initialEntries={["/project"]} />)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listProjects).mockResolvedValue([])
  vi.mocked(listUsers).mockResolvedValue(directoryUsers)
})

describe("/project list", () => {
  it("shows a skeleton while projects load, then the list", async () => {
    let resolveProjects!: (value: ProjectSummary[]) => void
    vi.mocked(listProjects).mockReturnValue(
      new Promise((resolve) => {
        resolveProjects = resolve
      }),
    )
    renderRoute()

    expect(
      await screen.findByRole("status", { name: "Loading projects" }),
    ).toBeInTheDocument()

    resolveProjects([summary])
    expect(
      await screen.findByRole("link", { name: /Peshitta Study/ }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("status", { name: "Loading projects" }),
    ).not.toBeInTheDocument()
  })

  it("shows an inviting empty state when there are no projects", async () => {
    renderRoute()
    expect(await screen.findByText("No projects yet")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /new project/i }),
    ).toBeInTheDocument()
  })

  it("lists projects with name, status badge, and last-updated info", async () => {
    vi.mocked(listProjects).mockResolvedValue([summary])
    renderRoute()
    expect(
      await screen.findByRole("link", { name: /Peshitta Study/ }),
    ).toBeInTheDocument()
    expect(screen.getByText("draft")).toBeInTheDocument()
    // The column header carries the "updated" wording now; the cell holds the
    // relative time, with the exact timestamp on its title.
    expect(
      screen.getByRole("columnheader", { name: "Updated" }),
    ).toBeInTheDocument()
    expect(screen.getByTitle(summary.updatedAt)).toHaveTextContent(
      formatRelativeTime(summary.updatedAt),
    )
  })

  it("renders one table row per project, with trailing row actions", async () => {
    vi.mocked(listProjects).mockResolvedValue([summary])
    renderRoute()

    const row = await screen.findByRole("row", { name: /Peshitta Study/ })
    // The row navigates via a link stretched over it, not a nested button —
    // <button> inside <a> is invalid and behaves inconsistently.
    expect(within(row).getByRole("link", { name: "Peshitta Study" })).toHaveAttribute(
      "href",
      "/project/p1",
    )
    // Icon-only actions: the accessible name comes from aria-label, so the
    // trigger must not also render the dialog's default "Delete" text.
    const edit = within(row).getByRole("button", { name: "Edit" })
    const remove = within(row).getByRole("button", { name: "Delete" })
    expect(edit).toHaveTextContent("")
    expect(remove).toHaveTextContent("")
  })

  it("opens the edit dialog from the row's edit action", async () => {
    const user = userEvent.setup()
    vi.mocked(listProjects).mockResolvedValue([summary])
    renderRoute()

    await user.click(await screen.findByRole("button", { name: "Edit" }))
    expect(await screen.findByLabelText("Name")).toHaveValue("Peshitta Study")
  })

  it("creates a project from the dialog with a required creator", async () => {
    const user = userEvent.setup()
    vi.mocked(createProject).mockResolvedValue(summary)
    renderRoute()

    await user.click(
      await screen.findByRole("button", { name: /new project/i }),
    )
    await user.type(await screen.findByLabelText("Name"), "Peshitta Study")
    await user.selectOptions(
      screen.getByLabelText("Creator"),
      "Ada Researcher",
    )
    await user.click(screen.getByRole("button", { name: "Create project" }))

    await waitFor(() =>
      expect(createProject).toHaveBeenCalledWith({
        name: "Peshitta Study",
        description: "",
        userId: "u1",
      }),
    )
    // action success revalidates the list
    await waitFor(() => expect(listProjects).toHaveBeenCalledTimes(2))
  })

  it("blocks creation and explains when the user directory is empty (FR-015)", async () => {
    const user = userEvent.setup()
    vi.mocked(listUsers).mockResolvedValue([])
    renderRoute()

    await user.click(
      await screen.findByRole("button", { name: /new project/i }),
    )
    expect(
      await screen.findByText(/no user profiles are available/i),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Create project" })).toBeDisabled()
    expect(createProject).not.toHaveBeenCalled()
  })

  it("shows the validation message when the name is missing", async () => {
    const user = userEvent.setup()
    vi.mocked(createProject).mockRejectedValue(
      new DataError("validation", "A project name is required."),
    )
    renderRoute()

    await user.click(
      await screen.findByRole("button", { name: /new project/i }),
    )
    await user.selectOptions(screen.getByLabelText("Creator"), "Ada Researcher")
    await user.click(screen.getByRole("button", { name: "Create project" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A project name is required.",
    )
    expect(createProject).toHaveBeenCalledTimes(1)
  })

  // The deferred-loader pattern (here, /corpus and both detail routes) is only
  // safe because a revalidation keeps the resolved UI mounted. If <Await> ever
  // re-suspends, every action would blank its page back to a skeleton.
  it("does not flash the skeleton back in when an action revalidates", async () => {
    const user = userEvent.setup()
    vi.mocked(listProjects).mockResolvedValue([summary])
    vi.mocked(createProject).mockResolvedValue(summary)
    renderRoute()
    await screen.findByRole("link", { name: /Peshitta Study/ })

    let skeletonReturned = false
    const observer = new MutationObserver(() => {
      if (document.querySelector('[aria-label="Loading projects"]')) {
        skeletonReturned = true
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })

    // A slow revalidation widens the window a re-suspend would show in.
    let resolveSecond!: (value: ProjectSummary[]) => void
    vi.mocked(listProjects).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSecond = resolve
      }),
    )

    await user.click(await screen.findByRole("button", { name: /new project/i }))
    await user.type(await screen.findByLabelText("Name"), "Another")
    await user.selectOptions(screen.getByLabelText("Creator"), "Ada Researcher")
    await user.click(screen.getByRole("button", { name: "Create project" }))
    await waitFor(() => expect(listProjects).toHaveBeenCalledTimes(2))

    // Mid-revalidation the stale row is still mounted. Asserted via
    // textContent: the open dialog marks the rest of the app aria-hidden,
    // which hides the row from role queries without unmounting it.
    expect(document.body.textContent).toContain("Peshitta Study")

    resolveSecond([summary])
    observer.disconnect()
    expect(skeletonReturned).toBe(false)
  })

  it("deletes a project only after confirmation", async () => {
    const user = userEvent.setup()
    vi.mocked(listProjects).mockResolvedValue([summary])
    vi.mocked(deleteProject).mockResolvedValue()
    renderRoute()

    await user.click(await screen.findByRole("button", { name: "Delete" }))
    expect(deleteProject).not.toHaveBeenCalled()
    expect(
      await screen.findByText(/deletes the project and its references/i),
    ).toBeInTheDocument()

    const confirm = screen.getByRole("button", { name: "Delete project" })
    expect(confirm).toBeDisabled()
    await user.type(screen.getByRole("textbox"), "DELETE")
    await user.click(confirm)
    await waitFor(() => expect(deleteProject).toHaveBeenCalledWith("p1"))
  })
})

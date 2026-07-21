import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createRoutesStub } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
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
    expect(screen.getByText(/updated/)).toBeInTheDocument()
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

    await user.click(screen.getByRole("button", { name: "Delete project" }))
    await waitFor(() => expect(deleteProject).toHaveBeenCalledWith("p1"))
  })
})

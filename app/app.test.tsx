import { Provider } from "jotai"
import { render, screen, within } from "@testing-library/react"
import { createRoutesStub } from "react-router"
import { describe, expect, it } from "vitest"
import ProtectedLayout from "@/components/layouts/protected-layout"
import Corpus from "@/routes/corpus"
import Dashboard from "@/routes/dashboard"
import Library from "@/routes/library"
import Project from "@/routes/project"
import References from "@/routes/references"

const Stub = createRoutesStub([
  {
    Component: ProtectedLayout,
    HydrateFallback: () => null,
    loader: () => ({
      user: { id: "test-user", email: "test@example.test", name: null, avatarUrl: null, emailConfirmed: true },
    }),
    children: [
      { index: true, Component: Dashboard },
      { path: "references", Component: References },
      { path: "library", Component: Library },
      {
        path: "project",
        Component: Project,
        HydrateFallback: () => null,
        loader: () => ({ data: Promise.resolve({ projects: [], users: [] }) }),
      },
      {
        path: "corpus",
        Component: Corpus,
        HydrateFallback: () => null,
        loader: () => ({ documents: [] }),
      },
    ],
  },
])

const renderAt = (path: string) => render(<Provider><Stub initialEntries={[path]} /></Provider>)

describe("routes", () => {
  it.each([
    ["/", "Dashboard"],
    ["/references", "References"],
    ["/library", "Library"],
    ["/project", "Projects"],
    ["/corpus", "Corpus"],
  ])("renders %s → %s", async (path, heading) => {
    renderAt(path)
    expect(
      await screen.findByRole("heading", { level: 1, name: heading }),
    ).toBeInTheDocument()
  })

  it("breadcrumb shows the trail for the current route", async () => {
    renderAt("/project")
    const breadcrumb = await screen.findByRole("navigation", {
      name: "breadcrumb",
    })
    expect(
      within(breadcrumb).getByRole("link", { name: "Dashboard" }),
    ).toHaveAttribute("href", "/dashboard")
    expect(within(breadcrumb).getByText("Projects")).toBeInTheDocument()
    expect(
      within(breadcrumb).queryByRole("link", { name: "Projects" }),
    ).not.toBeInTheDocument()
  })

  it("shows sidebar navigation links", async () => {
    renderAt("/")
    await screen.findByRole("treeitem", { name: "Dashboard" })
    for (const label of [
      "Dashboard",
      "References",
      "Library",
      "Project",
      "Corpus",
    ]) {
      // The modernized layout renders navigation as a tree of buttons
      // (corpora-ui Tree), not anchor links.
      expect(screen.getByRole("treeitem", { name: label })).toBeInTheDocument()
    }
  })
})

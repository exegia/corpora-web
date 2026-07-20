import { render, screen } from "@testing-library/react"
import { createRoutesStub } from "react-router"
import { describe, expect, it } from "vitest"
import { AppLayout } from "@/components/app-layout"
import Corpus from "@/routes/corpus"
import Dashboard from "@/routes/dashboard"
import Library from "@/routes/library"
import Project from "@/routes/project"
import References from "@/routes/references"

const Stub = createRoutesStub([
  {
    Component: AppLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "references", Component: References },
      { path: "library", Component: Library },
      {
        path: "project",
        Component: Project,
        HydrateFallback: () => null,
        loader: () => ({ projects: [] }),
      },
      { path: "corpus", Component: Corpus },
    ],
  },
])

const renderAt = (path: string) => render(<Stub initialEntries={[path]} />)

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

  it("shows sidebar navigation links", () => {
    renderAt("/")
    for (const label of [
      "Dashboard",
      "References",
      "Library",
      "Project",
      "Corpus",
    ]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument()
    }
  })
})

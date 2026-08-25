import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createRoutesStub } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import DetailSheet from "./detail-sheet"
import type { LicenceDetail } from "@/lib/licenses"

const licence: LicenceDetail = {
    id: "CC-BY-4.0",
    title: "Creative Commons Attribution 4.0",
    url: "https://creativecommons.org/licenses/by/4.0/",
    domains: { content: true, data: true, software: false },
    status: "active",
    family: "CC",
    maintainer: "Creative Commons",
    isGeneric: false,
    legacyIds: [],
    odConformance: "approved",
    osdConformance: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: null,
    fullText: "# Terms\n\nYou may **share** the material.",
}

const findLicenceByLabel = vi.hoisted(() => vi.fn())
const resolveLicenceText = vi.hoisted(() => vi.fn())

vi.mock("@/lib/licenses", async (importOriginal) => {
    const original = await importOriginal<typeof import("@/lib/licenses")>()
    return {
        ...original,
        default: {
            ...original.default,
            Catalog: { ...original.default.Catalog, findLicenceByLabel },
            Text: { ...original.default.Text, resolveLicenceText },
        },
    }
})

function renderSheet(label = "CC BY 4.0") {
    const Stub = createRoutesStub([
        { path: "/", Component: () => <DetailSheet label={label} /> },
    ])
    return render(<Stub initialEntries={["/"]} />)
}

describe("licence detail sheet", () => {
    beforeEach(() => {
        findLicenceByLabel.mockReset()
        resolveLicenceText.mockReset()
    })

    it("opens a sheet with the licence detail and markdown terms", async () => {
        findLicenceByLabel.mockResolvedValue(licence)
        resolveLicenceText.mockResolvedValue(licence.fullText)
        renderSheet()

        await userEvent.click(screen.getByRole("button", { name: "CC BY 4.0" }))

        expect(
            await screen.findByRole("heading", {
                name: "Creative Commons Attribution 4.0",
            }),
        ).toBeInTheDocument()
        // The detail grid is rendered inside the sheet.
        expect(screen.getByText("Identifier")).toBeInTheDocument()
        expect(screen.getByText("CC-BY-4.0")).toBeInTheDocument()
        // The terms markdown is rendered to elements, not shown as source.
        expect(await screen.findByText("share")).toBeInTheDocument()
        expect(screen.getByText("share").tagName).toBe("STRONG")
        expect(
            screen.getByRole("link", { name: "Open" }),
        ).toHaveAttribute("href", "/licenses/CC-BY-4.0")
        expect(findLicenceByLabel).toHaveBeenCalledWith("CC BY 4.0")
    })

    it("falls back to a catalog pointer for an unknown label", async () => {
        findLicenceByLabel.mockResolvedValue(null)
        renderSheet("Bespoke EULA")

        await userEvent.click(screen.getByRole("button", { name: "Bespoke EULA" }))

        expect(
            await screen.findByText(/is not in the licence catalog/),
        ).toBeInTheDocument()
        expect(screen.getByRole("link", { name: "licence catalog" })).toHaveAttribute(
            "href",
            "/licenses",
        )
    })

    it("only resolves the licence once across open cycles", async () => {
        findLicenceByLabel.mockResolvedValue(licence)
        resolveLicenceText.mockResolvedValue(null)
        renderSheet()

        await userEvent.click(screen.getByRole("button", { name: "CC BY 4.0" }))
        await screen.findByText("Identifier")
        await userEvent.keyboard("{Escape}")
        await userEvent.click(screen.getByRole("button", { name: "CC BY 4.0" }))

        expect(await screen.findByText("Identifier")).toBeInTheDocument()
        expect(findLicenceByLabel).toHaveBeenCalledTimes(1)
        // Null text shows the honest fallback, not an empty prose block.
        expect(
            screen.getByText(/No licence text could be downloaded/),
        ).toBeInTheDocument()
    })
})

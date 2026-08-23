import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createRoutesStub } from "react-router"
import { describe, expect, it } from "vitest"
import ProfileCard from "./profile-card"
import type { SessionUser } from "@/lib/auth/types"

const user: SessionUser = {
    id: "u-1",
    email: "test@corpora.local",
    name: "Test User",
    avatarUrl: null,
    emailConfirmed: true,
}

function renderCard(overrides: Partial<SessionUser> = {}) {
    const Stub = createRoutesStub([
        { path: "/", Component: () => <ProfileCard user={{ ...user, ...overrides }} /> },
    ])
    return render(<Stub initialEntries={["/"]} />)
}

describe("sidebar profile card preview", () => {
    it("shows the account preview on hover", async () => {
        renderCard()
        const trigger = document.querySelector('[data-slot="preview-card-trigger"]')
        expect(trigger).not.toBeNull()

        await userEvent.hover(trigger as Element)

        // The preview opens after Base UI's hover delay.
        await waitFor(
            () => {
                expect(
                    document.querySelector('[data-slot="preview-card-content"]'),
                ).not.toBeNull()
            },
            { timeout: 3000 },
        )
        const popup = document.querySelector('[data-slot="preview-card-content"]')!
        expect(popup.textContent).toContain("Test User")
        expect(popup.textContent).toContain("test@corpora.local")
        expect(popup.textContent).toContain("Email verified")
    })

    it("flags an unconfirmed email in the preview", async () => {
        renderCard({ emailConfirmed: false })
        const trigger = document.querySelector('[data-slot="preview-card-trigger"]')

        await userEvent.hover(trigger as Element)

        await waitFor(
            () => {
                expect(
                    document.querySelector('[data-slot="preview-card-content"]'),
                ).not.toBeNull()
            },
            { timeout: 3000 },
        )
        expect(
            document.querySelector('[data-slot="preview-card-content"]')!.textContent,
        ).toContain("Email unverified")
    })

    it("keeps the account menu working under the preview trigger", async () => {
        renderCard()
        await userEvent.click(
            screen.getByRole("button", { name: /account menu/i }),
        )
        expect(
            await screen.findByRole("menuitem", { name: "Profile" }),
        ).toBeInTheDocument()
        expect(
            await screen.findByRole("menuitem", { name: "Log out" }),
        ).toBeInTheDocument()
    })
})

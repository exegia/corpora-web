import { useState } from "react"
import { Provider } from "jotai"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, it } from "vitest"
import { useAppShellPanels } from "./shell-layout"

function RouteControl() {
    const { openPanel } = useAppShellPanels()
    return <button onClick={() => openPanel("right", <p>Shared panel content</p>)}>Open panel</button>
}

function Shell() {
    const { open, setOpen, providerProps } = useAppShellPanels()
    const [routeMounted, setRouteMounted] = useState(true)
    return (
        <>
            {routeMounted && <RouteControl />}
            <button onClick={() => setRouteMounted(value => !value)}>Change route</button>
            <button onClick={() => setOpen(false, "right")}>Close panel</button>
            {open.right && providerProps.panelComponents?.right}
        </>
    )
}

it("shares panel state across hooks and keeps it when a route unmounts", async () => {
    const user = userEvent.setup()
    render(<Provider><Shell /></Provider>)
    await user.click(screen.getByRole("button", { name: "Open panel" }))
    expect(screen.getByText("Shared panel content")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Change route" }))
    expect(screen.getByText("Shared panel content")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Close panel" }))
    expect(screen.queryByText("Shared panel content")).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Change route" }))
    await user.click(screen.getByRole("button", { name: "Open panel" }))
    expect(screen.getByText("Shared panel content")).toBeInTheDocument()
})

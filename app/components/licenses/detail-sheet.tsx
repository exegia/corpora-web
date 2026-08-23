import { ChevronDownIcon } from "lucide-react"
import { useState } from "react"
import { useRemarkSync } from "react-remark"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Frame, FrameHeader, FramePanel } from "@/components/ui/frame"
import {
    Sheet,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetPanel,
    SheetPopup,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import DetailView from "./detail-view"
import { findLicenceByLabel, resolveLicenceText } from "@/lib/licenses"
import type { LicenceDetail } from "@/lib/licenses"

/** The p-frame-2 collapsible section, minus that particle's delete action. */
function CollapsibleFrame({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <Frame className="w-full">
            <Collapsible defaultOpen>
                <FrameHeader className="flex-row items-center px-2 py-2">
                    <CollapsibleTrigger
                        className="data-panel-open:[&_svg]:rotate-180"
                        render={<Button variant="ghost" />}>
                        <ChevronDownIcon className="size-4" />
                        {title}
                    </CollapsibleTrigger>
                </FrameHeader>
                <CollapsiblePanel>
                    <FramePanel>{children}</FramePanel>
                </CollapsiblePanel>
            </Collapsible>
        </Frame>
    )
}

type SheetState =
    | { status: "idle" | "loading" }
    | { status: "missing" }
    | { status: "ready"; licence: LicenceDetail; text: string | null }

/**
 * A licence label that opens a right-hand sheet with the catalog detail and
 * the licence terms rendered as markdown. The label is a manifest string, not
 * a catalog id — resolution is best effort, and an unknown label falls back
 * to a pointer at the catalog. Loaded lazily on first open: the corpus page
 * itself never pays for the licence text.
 */
export default function LicenceDetailSheet({ label }: { label: string }) {
    const [state, setState] = useState<SheetState>({ status: "idle" })

    const handleOpenChange = (open: boolean) => {
        if (!open || state.status !== "idle") return
        setState({ status: "loading" })
        findLicenceByLabel(label)
            .then(async licence => {
                if (!licence) return setState({ status: "missing" })
                const text = await resolveLicenceText(licence)
                setState({ status: "ready", licence, text })
            })
            .catch(() => setState({ status: "missing" }))
    }

    // Hooks are unconditional — an empty source renders to nothing.
    const terms = useRemarkSync(state.status === "ready" ? (state.text ?? "") : "")

    return (
        <Sheet onOpenChange={handleOpenChange}>
            <SheetTrigger className="text-warning-foreground hover:underline">{label}</SheetTrigger>
            <SheetPopup side="right" variant="inset">
                <SheetHeader>
                    <SheetTitle>{state.status === "ready" ? state.licence.title : label}</SheetTitle>
                    <SheetDescription>
                        {state.status === "ready"
                            ? [state.licence.id, state.licence.family].filter(Boolean).join(" · ")
                            : "Licence detail and terms"}
                    </SheetDescription>
                </SheetHeader>
                <SheetPanel className="flex flex-col gap-6">
                    {state.status === "ready" ? (
                        <>
                            <CollapsibleFrame title="Details">
                                <DetailView licence={state.licence} />
                            </CollapsibleFrame>
                            {state.text !== null ? (
                                <div className="licence-prose">{terms}</div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    No licence text could be downloaded for this licence
                                    {state.licence.url ? (
                                        <>
                                            {" — read it at "}
                                            <a
                                                className="break-all underline-offset-2 hover:underline"
                                                href={state.licence.url}
                                                rel="noreferrer"
                                                target="_blank">
                                                {state.licence.url}
                                            </a>
                                            .
                                        </>
                                    ) : (
                                        "."
                                    )}
                                </p>
                            )}
                        </>
                    ) : state.status === "missing" ? (
                        <p className="text-sm text-muted-foreground">
                            “{label}” is not in the licence catalog. Browse the{" "}
                            <Link className="underline-offset-2 hover:underline" to="/licenses">
                                licence catalog
                            </Link>{" "}
                            instead.
                        </p>
                    ) : (
                        <div aria-label="Loading licence" className="flex flex-col gap-3" role="status">
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-40 w-full" />
                        </div>
                    )}
                </SheetPanel>
                {state.status === "ready" && (
                    <SheetFooter>
                        <Button render={<Link to={`/licenses/${state.licence.id}`} />} variant="outline">
                            Open
                        </Button>
                    </SheetFooter>
                )}
            </SheetPopup>
        </Sheet>
    )
}

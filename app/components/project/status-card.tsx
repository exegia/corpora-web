import { CheckCircle2, Circle, Send, ShieldCheck, Undo2 } from "lucide-react"
import type { useFetcher } from "react-router"

import { Button } from "@exegia/corpora-ui"
import StatusBlock from "@/components/status.block"
import { type ProjectDetail, type ProjectStatus, reviewIssues } from "@/lib/projects"

type StatusFetcher = ReturnType<typeof useFetcher<{ ok: boolean; error?: string }>>

/** One status transition, rendered as a button in the card's action stack. */
interface StatusAction {
    label: string
    icon: React.ReactNode
    variant?: "default" | "outline"
    disabled?: boolean
    onClick: () => void
}

/**
 * The status workflow as contextual actions instead of a select: the
 * creator submits for review; the superadmin publishes or returns to draft.
 * The first action is the card's primary; the rest render underneath it.
 */
function statusActions(project: ProjectDetail, superadmin: boolean, fetcher: StatusFetcher): StatusAction[] {
    const busy = fetcher.state !== "idle"
    const submit = (status: ProjectStatus) => fetcher.submit({ intent: "set-status", status }, { method: "post" })

    const toDraft: StatusAction = {
        label: "Change to draft",
        icon: <Undo2 aria-hidden="true" />,
        variant: "outline",
        disabled: busy,

        onClick: () => submit("draft"),
    }

    if (project.status === "ready-for-review") {
        if (!superadmin) return []
        return [
            {
                label: "Publish",
                icon: <ShieldCheck aria-hidden="true" />,
                disabled: busy,
                onClick: () => submit("published"),
            },
            toDraft,
        ]
    }

    if (project.status === "published") {
        return superadmin ? [toDraft] : []
    }

    // Drafting (incl. legacy started/failed rows, which only return to draft).
    return [
        {
            label: "Ready for review",
            icon: <Send aria-hidden="true" />,
            disabled: busy || reviewIssues(project).length > 0,
            onClick: () => submit("ready-for-review"),
        },
        ...(project.status !== "draft" ? [toDraft] : []),
    ]
}

/** The headline pairing above the checklist, per workflow position. */
function summary(project: ProjectDetail, superadmin: boolean): { title: string; description: string } {
    if (project.status === "published") {
        return {
            title: "Published",
            description: "This project is live in the catalog.",
        }
    }
    if (project.status === "ready-for-review") {
        return superadmin
            ? {
                  title: "Awaiting approval",
                  description: "Publish this project, or send it back to draft.",
              }
            : {
                  title: "In review",
                  description: "Waiting for the superadmin to approve.",
              }
    }
    return reviewIssues(project).length > 0
        ? {
              title: "Unpublished project",
              description: "Complete every requirement before submitting.",
          }
        : {
              title: "Ready to submit",
              description: "Every requirement for review is met.",
          }
}

/** The three ready-for-review requirements with their pass/fail state. */
function ReviewChecklist({ project }: { project: ProjectDetail }) {
    const checks = [
        { label: "Licence attached and agreed", ok: project.licenses.length > 0 },
        { label: "Classified (bible, book, …)", ok: project.type !== null },
        { label: "Corpus attached", ok: project.corpus !== null },
    ]
    return (
        <ul className="flex flex-col gap-2">
            {checks.map(check => (
                <li key={check.label} className="flex items-center gap-2">
                    {check.ok ? (
                        <CheckCircle2
                            aria-hidden="true"
                            className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-500"
                        />
                    ) : (
                        <Circle aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span
                        className={
                            check.ok
                                ? "text-xs font-medium text-emerald-700 dark:text-emerald-400"
                                : "text-xs text-muted-foreground"
                        }>
                        {check.label}
                    </span>
                </li>
            ))}
        </ul>
    )
}

export interface ProjectStatusCardProps {
    project: ProjectDetail
    /** Pre-auth: true when the superadmin exists in the directory (research R4). */
    superadmin: boolean
    fetcher: StatusFetcher
}

/**
 * Publish-panel layout: the current status on the header row, the review
 * requirements as verification rows, and the workflow transitions stacked
 * full-width at the bottom of the card.
 */
export function StatusCard({ project, superadmin, fetcher }: ProjectStatusCardProps) {
    const actions = statusActions(project, superadmin, fetcher)
    const { title, description } = summary(project, superadmin)
    const showChecklist = !["ready-for-review", "published"].includes(project.status)

    return (
        <div className="flex h-full flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-card-foreground">Status</span>
                <StatusBlock status={project.status} />
            </div>

            <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-card-foreground">{title}</span>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                {showChecklist && <ReviewChecklist project={project} />}
            </div>

            {fetcher.data?.ok === false && fetcher.data.error && (
                <p role="alert" className="text-xs text-destructive">
                    {fetcher.data.error}
                </p>
            )}

            {actions.length > 0 && (
                <div className="mt-auto flex flex-col gap-2 pt-2">
                    {actions.map(({ label, icon, variant = "default", ...props }) => (
                        <Button key={label} className="w-full" size="lg" variant={variant} {...props}>
                            {icon}
                            {label}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    )
}

export default StatusCard

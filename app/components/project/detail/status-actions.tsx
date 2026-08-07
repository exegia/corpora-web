import { Send, ShieldCheck, Undo2 } from "lucide-react"
import type { StatusAction, StatusFetcher } from "@/components/project/detail/types"
import { type ProjectDetail, type ProjectStatus, reviewIssues } from "@/lib/projects"

/**
 * The status workflow as contextual actions instead of a select: the
 * creator submits for review; the superadmin publishes or returns to draft.
 * The first action is the card's primary; the rest render underneath it.
 */
export function statusActions(project: ProjectDetail, superadmin: boolean, fetcher: StatusFetcher): StatusAction[] {
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
export function statusSummary(project: ProjectDetail, superadmin: boolean): { title: string; description: string } {
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

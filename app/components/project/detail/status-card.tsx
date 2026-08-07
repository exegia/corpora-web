import { Button } from "@exegia/corpora-ui"
import StatusBlock from "@/components/blocks/status.block"
import ReviewChecklist from "@/components/project/detail/review-checklist"
import { statusActions, statusSummary } from "@/components/project/detail/status-actions"
import type { StatusCardProps } from "@/components/project/detail/types"

/**
 * Publish-panel layout: the current status on the header row, the review
 * requirements as verification rows, and the workflow transitions stacked
 * full-width at the bottom of the card.
 */
export default function StatusCard({ project, superadmin, fetcher }: StatusCardProps) {
    const actions = statusActions(project, superadmin, fetcher)
    const { title, description } = statusSummary(project, superadmin)
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

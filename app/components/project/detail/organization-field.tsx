import { Blocks } from "@/components/blocks"
import { CircleX, Pencil } from "lucide-react"
import { useFetcher } from "react-router"
import { Badge } from "@/components/ui/badge"
import type { OrganizationFieldProps } from "@/components/project/detail/types"
import type { ActionResult } from "@/components/project/types"

/** The organization chip, its inline clear control, and the edit affordance. */
export default function OrganizationField({ organization, readOnly, onEdit }: OrganizationFieldProps) {
    const clearFetcher = useFetcher<ActionResult>()

    return (
        <Blocks.Metadata
            label="Organization"
            value={
                <>
                    <div className="flex flex-wrap items-center gap-2">
                        {organization ? (
                            // The name and its remove control are one chip: a
                            // relative wrapper so the corner button can hang off
                            // the badge, and a sibling of the link rather than a
                            // child — a <button> inside an <a> is invalid.
                            <span className="relative inline-flex max-w-full">
                                <Badge
                                    size="lg"
                                    variant="outline"
                                    className="max-w-full"
                                    render={
                                        organization.website ? (
                                            <a href={organization.website} target="_blank" rel="noreferrer" />
                                        ) : undefined
                                    }>
                                    <span className="truncate">{organization.name}</span>
                                </Badge>
                                {!readOnly && (
                                    <clearFetcher.Form method="post" className="absolute -top-1.5 -right-1.5">
                                        <input type="hidden" name="intent" value="set-organization" />
                                        <input type="hidden" name="organizationId" value="" />
                                        <button
                                            type="submit"
                                            aria-label="Remove"
                                            disabled={clearFetcher.state !== "idle"}
                                            className="flex rounded-full bg-background text-muted-foreground transition-colors outline-none hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-64">
                                            <CircleX aria-hidden="true" className="size-3.5" />
                                        </button>
                                    </clearFetcher.Form>
                                )}
                            </span>
                        ) : (
                            <span className="text-muted-foreground">No organization</span>
                        )}
                    </div>
                    {clearFetcher.data?.ok === false && clearFetcher.data.error && (
                        <p role="alert" className="text-xs text-destructive">
                            {clearFetcher.data.error}
                        </p>
                    )}
                </>
            }
            actions={
                readOnly
                    ? undefined
                    : [
                          {
                              label: "Edit",
                              icon: <Pencil aria-hidden="true" />,
                              onClick: onEdit,
                              "aria-label": "Edit organization",
                          },
                      ]
            }
        />
    )
}

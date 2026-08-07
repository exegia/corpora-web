import { Blocks } from "@/components/blocks"
import { CircleX } from "lucide-react"
import { useFetcher } from "react-router"
import { Badge } from "@/components/ui/badge"
import type { OrganizationFieldProps } from "@/components/project/detail/types"
import type { ActionResult } from "@/components/project/types"

/** The organization chip and its inline clear control. */
export default function OrganizationField({ organization, readOnly, onEdit }: OrganizationFieldProps) {
    const clearFetcher = useFetcher<ActionResult>()

    return (
        <Blocks.Metadata
            label="Organization"
            value={
                organization && (
                    <>
                        <div className="flex flex-wrap items-center gap-2">
                            {/*
                                The name and its remove control are one chip: a
                                relative wrapper so the corner button can hang
                                off the badge, and a sibling of it rather than a
                                child — a <button> inside a <button> is invalid.
                            */}
                            <span className="relative inline-flex max-w-full">
                                <Badge
                                    size="lg"
                                    variant="outline"
                                    className="max-w-full"
                                    render={
                                        // The badge opens the organization
                                        // editor; the website URL has its own
                                        // row below, so nothing is lost by
                                        // dropping the link here.
                                        readOnly ? undefined : (
                                            <button type="button" aria-label="Edit organization" onClick={onEdit} />
                                        )
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
                        </div>
                        {clearFetcher.data?.ok === false && clearFetcher.data.error && (
                            <p role="alert" className="text-xs text-destructive">
                                {clearFetcher.data.error}
                            </p>
                        )}
                    </>
                )
            }
            addAction={readOnly ? undefined : { onClick: onEdit, "aria-label": "Add organization" }}
        />
    )
}

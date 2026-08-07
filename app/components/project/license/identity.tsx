import { Badge } from "@/components/ui/badge"
import type { IdentityProps } from "@/components/project/license/types"

/** Title plus one line of context — shared by the pending card and agreed rows. */
export default function Identity({ license, meta }: IdentityProps) {
    return (
        <div className="min-w-0">
            <p className="truncate text-sm font-medium">
                {license.title}
                {license.status !== "active" && (
                    <Badge variant="destructive" className="ms-2">
                        {license.status}
                    </Badge>
                )}
            </p>
            <p className="truncate text-xs text-muted-foreground">{meta}</p>
        </div>
    )
}

import { Scale } from "lucide-react"
import type { TileProps } from "@/components/project/license/types"

/** Shared leading tile, so the pending card and the agreed rows stay a family. */
export default function Tile({ className }: TileProps) {
    return (
        <div
            className={`flex shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ${className ?? "size-9"}`}>
            <Scale aria-hidden="true" className="size-4.5" />
        </div>
    )
}

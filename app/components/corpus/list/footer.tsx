import { Button } from "@/components/ui/button"
import type { FooterProps } from "./types"

/** "Showing 1–6 of 12 corpuses" + Prev/Next below the table. */
export default function Footer({ page, pageCount, total, start, end, onPageChange }: FooterProps) {
    return (
        <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
                Showing {start}–{end} of {total} {total === 1 ? "corpus" : "corpuses"}
            </p>
            {pageCount > 1 && (
                <div className="flex items-center gap-2">
                    <Button
                        disabled={page <= 1}
                        onClick={() => onPageChange(page - 1)}
                        size="sm"
                        type="button"
                        variant="outline">
                        Prev
                    </Button>
                    <Button
                        disabled={page >= pageCount}
                        onClick={() => onPageChange(page + 1)}
                        size="sm"
                        type="button"
                        variant="outline">
                        Next
                    </Button>
                </div>
            )}
        </div>
    )
}

import { FileArchive } from "lucide-react"
import type { CardProps } from "@/components/corpus/types"
import { formatDate } from "@/lib/format"

/** One corpus document: leading icon, name, source + date meta. */
export default function Card({ document, actions }: CardProps) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="flex min-w-0 items-center gap-3">
                <FileArchive aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                        {document.source === "huggingface" ? (
                            <a
                                href={document.path}
                                target="_blank"
                                rel="noreferrer"
                                className="underline-offset-2 hover:underline">
                                {document.name}
                            </a>
                        ) : (
                            document.name
                        )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                        {document.source === "huggingface" ? "Hugging Face" : "Uploaded file"}
                        {document.uploadedAt && ` · added ${formatDate(document.uploadedAt)}`}
                    </p>
                </div>
            </div>
            {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
        </div>
    )
}

import { CheckCircle2, Circle } from "lucide-react"
import type { ReviewChecklistProps } from "@/components/project/detail/types"

/** The three ready-for-review requirements with their pass/fail state. */
export default function ReviewChecklist({ project }: ReviewChecklistProps) {
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

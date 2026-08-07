import { Badge } from "@/components/ui/badge"
import type { ProjectStatus } from "@/lib/projects"
import type { StatusBlockProps } from "@/components/blocks/types"

const STATUS_CONFIG: Record<ProjectStatus, { label: string; dot: string }> = {
  draft: { label: "Draft", dot: "bg-gray-500" },
  started: { label: "Started", dot: "bg-blue-500" },
  "ready-for-review": { label: "Ready for review", dot: "bg-amber-500" },
  published: { label: "Published", dot: "bg-emerald-500" },
  failed: { label: "Failed", dot: "bg-red-500" },
}

export default function StatusBlock({ status, className }: StatusBlockProps) {
  const { label, dot } = STATUS_CONFIG[status]
  return (
    <Badge variant="outline" className={className}>
      <span aria-hidden="true" className={`size-1.5 rounded-full ${dot}`} />
      {label}
    </Badge>
  )
}

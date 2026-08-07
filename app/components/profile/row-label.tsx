import { Label } from "@/components/ui/label"

/** Left column of a row: what the field is and where it shows up. */
export default function RowLabel({
  htmlFor,
  title,
  hint,
  badge,
}: {
  htmlFor?: string
  title: string
  hint: string
  badge?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-2">
        <Label className="text-sm font-medium" htmlFor={htmlFor}>
          {title}
        </Label>
        {badge}
      </span>
      <span className="text-sm text-muted-foreground">{hint}</span>
    </div>
  )
}

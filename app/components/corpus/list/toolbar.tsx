import { Search } from "lucide-react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { CorpusType } from "@/lib/corpus"
import type { CorpusFilters, DateFilter, ToolbarProps } from "./types"
import { TYPE_LABELS } from "./utils"

const TYPE_ITEMS: Array<{ label: string; value: CorpusType | "all" }> = [
  { label: "All", value: "all" },
  ...(Object.entries(TYPE_LABELS) as Array<[CorpusType, string]>).map(
    ([value, label]) => ({ label, value }),
  ),
]

const DATE_ITEMS: Array<{ label: string; value: DateFilter }> = [
  { label: "Any time", value: "any" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last year", value: "year" },
]

function FilterSelect<Value extends string>({
  label,
  value,
  items,
  onChange,
}: {
  label: string
  value: Value
  items: Array<{ label: string; value: Value }>
  onChange: (value: Value) => void
}) {
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => onChange(next as Value)}
    >
      {/* w-full on the trigger is for form layouts — these are toolbar chips. */}
      <SelectTrigger
        aria-label={`Filter by ${label.toLowerCase()}`}
        className="w-auto"
      >
        <span className="text-muted-foreground">{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectPopup>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  )
}

/** Search + type/date/language filters + result count over the table. */
export default function Toolbar({
  filters,
  onFiltersChange,
  languages,
  total,
}: ToolbarProps) {
  const patch = (change: Partial<CorpusFilters>) =>
    onFiltersChange({ ...filters, ...change })

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="lg:max-w-xs lg:flex-1">
        <InputGroup>
          <InputGroupAddon>
            <Search aria-hidden="true" className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search corpuses"
            placeholder="Search corpuses…"
            value={filters.query}
            onChange={(event) => patch({ query: event.currentTarget.value })}
          />
        </InputGroup>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect
          label="Type"
          value={filters.type}
          items={TYPE_ITEMS}
          onChange={(type) => patch({ type })}
        />
        <FilterSelect
          label="Date"
          value={filters.date}
          items={DATE_ITEMS}
          onChange={(date) => patch({ date })}
        />
        <FilterSelect
          label="Language"
          value={filters.language}
          items={[
            { label: "All", value: "all" },
            ...languages.map((language) => ({
              label: language,
              value: language,
            })),
          ]}
          onChange={(language) => patch({ language })}
        />
      </div>
      <p className="text-muted-foreground text-sm lg:ms-auto">
        {total} {total === 1 ? "corpus" : "corpuses"}
      </p>
    </div>
  )
}

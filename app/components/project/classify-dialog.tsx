import {
  Book,
  BookA,
  BookOpenText,
  Check,
  Feather,
  Landmark,
  MessageSquareText,
  MoonStar,
  NotebookPen,
  Scroll,
  ScrollText,
  UserRound,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useFetcher } from "react-router"
import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxValue,
} from "@/components/ui/combobox"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BOOK_TYPES,
  type BookType,
  CATEGORIZED_TYPES,
  CATEGORY_TYPES,
  type CategoryType,
  type LanguageType,
  languageOptionsFor,
  SCRIPTURAL_TYPES,
} from "@/lib/projects"

const TYPE_ICONS: Record<BookType, LucideIcon> = {
  bible: BookOpenText,
  tanakh: ScrollText,
  quran: MoonStar,
  apocrypha: Scroll,
  commentary: MessageSquareText,
  lexicon: BookA,
  biography: UserRound,
  review: NotebookPen,
  manuscript: Feather,
  regular: Book,
}

function TypeLabel({ type }: { type: BookType | "" }) {
  if (!type) return <span className="text-muted-foreground">Unclassified</span>
  const Icon = TYPE_ICONS[type]
  return (
    <span className="flex items-center gap-2">
      <Icon aria-hidden="true" className="size-4 opacity-80" />
      <span className="truncate capitalize">{type}</span>
    </span>
  )
}

function IconLabel({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <span className="flex items-center gap-2">
      <Icon aria-hidden="true" className="size-4 opacity-80" />
      <span className="truncate capitalize">{text}</span>
    </span>
  )
}

export interface ClassifyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  current: {
    type: BookType | null
    languages: LanguageType[]
    category: CategoryType | null
  }
}

/**
 * Type + conditional classification (FR-005..FR-009): scriptural types require
 * one or more source languages, secondary-literature types a category, the
 * rest neither. The language vocabulary narrows per type (LANGUAGES_BY_TYPE —
 * e.g. quran offers only arabic and english). The DB CHECK constraint remains
 * the enforcement of record.
 */
export function ClassifyDialog({ open, onOpenChange, current }: ClassifyDialogProps) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>()
  const submittedRef = useRef(false)
  const [type, setType] = useState<BookType | "">(current.type ?? "")
  const [languages, setLanguages] = useState<LanguageType[]>(current.languages)
  const [category, setCategory] = useState<CategoryType | "">(current.category ?? "")
  const busy = fetcher.state !== "idle"

  const needsLanguage = (SCRIPTURAL_TYPES as readonly string[]).includes(type)
  const needsCategory = (CATEGORIZED_TYPES as readonly string[]).includes(type)
  const languageItems = (languageOptionsFor(type) as LanguageType[]).map(
    (language) => ({
      value: language,
      label: language.charAt(0).toUpperCase() + language.slice(1),
    }),
  )
  const selectedLanguageItems = languageItems.filter((item) =>
    languages.includes(item.value),
  )
  const incomplete =
    (needsLanguage && languages.length === 0) || (needsCategory && !category)

  useEffect(() => {
    if (open) {
      setType(current.type ?? "")
      setLanguages(current.languages)
      setCategory(current.category ?? "")
    }
  }, [open, current.type, current.languages, current.category])

  useEffect(() => {
    if (submittedRef.current && fetcher.state === "idle" && fetcher.data?.ok) {
      submittedRef.current = false
      onOpenChange(false)
    }
  }, [fetcher.state, fetcher.data, onOpenChange])

  const submit = () => {
    submittedRef.current = true
    fetcher.submit(
      { intent: "classify", type, languages: languages.join(","), category },
      { method: "post" },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Classify project</DialogTitle>
          <DialogDescription>
            Pick the kind of book this project is about. Scriptural types ask
            for one or more source languages; commentary, biography, and review
            ask for a category.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="classify-type">Type</Label>
            <Select
              value={type}
              onValueChange={(next) => {
                const nextType = String(next ?? "") as BookType | ""
                setType(nextType)
                // FR-009: a type switch drops the no-longer-applicable values,
                // and languages outside the new type's vocabulary are cleared.
                if (!(SCRIPTURAL_TYPES as readonly string[]).includes(nextType)) {
                  setLanguages([])
                } else {
                  const allowed = languageOptionsFor(nextType)
                  setLanguages((selected) =>
                    selected.filter((language) => allowed.includes(language)),
                  )
                }
                if (!(CATEGORIZED_TYPES as readonly string[]).includes(nextType)) {
                  setCategory("")
                }
              }}
            >
              <SelectTrigger className="w-full" id="classify-type">
                <SelectValue>
                  {(value: BookType | "") => <TypeLabel type={value} />}
                </SelectValue>
              </SelectTrigger>
              <SelectPopup>
                <SelectItem value="">
                  <span className="text-muted-foreground">Unclassified</span>
                </SelectItem>
                {BOOK_TYPES.map((bookType) => (
                  <SelectItem key={bookType} value={bookType}>
                    <TypeLabel type={bookType} />
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </div>
          {needsLanguage && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="classify-languages">Source languages</Label>
              <Combobox
                items={languageItems}
                multiple
                value={selectedLanguageItems}
                onValueChange={(next) =>
                  setLanguages(
                    (next as { value: LanguageType }[]).map((item) => item.value),
                  )
                }
              >
                <ComboboxChips>
                  <ComboboxValue>
                    {(value: { value: LanguageType; label: string }[]) => (
                      <>
                        {value?.map((item) => (
                          <ComboboxChip key={item.value} aria-label={item.label}>
                            {item.label}
                          </ComboboxChip>
                        ))}
                        <ComboboxChipsInput
                          id="classify-languages"
                          placeholder={
                            value.length > 0 ? undefined : "Pick languages…"
                          }
                        />
                      </>
                    )}
                  </ComboboxValue>
                </ComboboxChips>
                <ComboboxPopup>
                  <ComboboxEmpty>No language found.</ComboboxEmpty>
                  <ComboboxList>
                    {(item: { value: LanguageType; label: string }) => (
                      <ComboboxItem key={item.value} value={item}>
                        {item.label}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxPopup>
              </Combobox>
            </div>
          )}
          {needsCategory && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="classify-category">Category</Label>
              <Select
                value={category}
                onValueChange={(next) =>
                  setCategory(String(next ?? "") as CategoryType | "")
                }
              >
                <SelectTrigger className="w-full" id="classify-category">
                  <SelectValue placeholder="Pick a category…">
                    {(value: CategoryType | "") =>
                      value ? (
                        <IconLabel icon={Landmark} text={value} />
                      ) : (
                        "Pick a category…"
                      )
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectPopup>
                  {CATEGORY_TYPES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      <IconLabel icon={Landmark} text={cat} />
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>
          )}
          {fetcher.data?.ok === false && fetcher.data.error && (
            <p role="alert" className="text-destructive text-sm">
              {fetcher.data.error}
            </p>
          )}
        </DialogPanel>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            <X aria-hidden="true" className="size-4" />
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={busy || incomplete}>
            <Check aria-hidden="true" className="size-4" />
            Save classification
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  )
}

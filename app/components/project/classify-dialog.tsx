import { useEffect, useRef, useState } from "react"
import { useFetcher } from "react-router"
import { Button } from "@/components/ui/button"
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
  BOOK_TYPES,
  type BookType,
  CATEGORIZED_TYPES,
  CATEGORY_TYPES,
  type CategoryType,
  LANGUAGE_TYPES,
  type LanguageType,
  SCRIPTURAL_TYPES,
} from "@/lib/projects"

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"

export interface ClassifyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  current: {
    type: BookType | null
    language: LanguageType | null
    category: CategoryType | null
  }
}

/**
 * Type + conditional classification (FR-005..FR-009): scriptural types require
 * a language, secondary-literature types a category, the rest neither. The
 * conditional field swaps with the type, mirroring the DB CHECK constraint.
 */
export function ClassifyDialog({ open, onOpenChange, current }: ClassifyDialogProps) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>()
  const submittedRef = useRef(false)
  const [type, setType] = useState<BookType | "">(current.type ?? "")
  const [language, setLanguage] = useState<LanguageType | "">(current.language ?? "")
  const [category, setCategory] = useState<CategoryType | "">(current.category ?? "")
  const busy = fetcher.state !== "idle"

  const needsLanguage = (SCRIPTURAL_TYPES as readonly string[]).includes(type)
  const needsCategory = (CATEGORIZED_TYPES as readonly string[]).includes(type)
  const incomplete = (needsLanguage && !language) || (needsCategory && !category)

  useEffect(() => {
    if (open) {
      setType(current.type ?? "")
      setLanguage(current.language ?? "")
      setCategory(current.category ?? "")
    }
  }, [open, current.type, current.language, current.category])

  useEffect(() => {
    if (submittedRef.current && fetcher.state === "idle" && fetcher.data?.ok) {
      submittedRef.current = false
      onOpenChange(false)
    }
  }, [fetcher.state, fetcher.data, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup>
        <fetcher.Form
          method="post"
          onSubmit={() => {
            submittedRef.current = true
          }}
          className="flex min-h-0 flex-col"
        >
          <DialogHeader>
            <DialogTitle>Classify project</DialogTitle>
            <DialogDescription>
              Pick the kind of book this project is about. Scriptural types ask
              for a source language; commentary, biography, and review ask for a
              category.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel className="flex flex-col gap-4">
            <input type="hidden" name="intent" value="classify" />
            <div className="flex flex-col gap-2">
              <Label htmlFor="classify-type">Type</Label>
              <select
                id="classify-type"
                name="type"
                value={type}
                onChange={(event) => {
                  const next = event.currentTarget.value as BookType | ""
                  setType(next)
                  // FR-009: a type switch drops the no-longer-applicable value
                  if (!(SCRIPTURAL_TYPES as readonly string[]).includes(next)) {
                    setLanguage("")
                  }
                  if (!(CATEGORIZED_TYPES as readonly string[]).includes(next)) {
                    setCategory("")
                  }
                }}
                className={SELECT_CLASS}
              >
                <option value="">Unclassified</option>
                {BOOK_TYPES.map((bookType) => (
                  <option key={bookType} value={bookType}>
                    {bookType}
                  </option>
                ))}
              </select>
            </div>
            {needsLanguage && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="classify-language">Source language</Label>
                <select
                  id="classify-language"
                  name="language"
                  value={language}
                  onChange={(event) =>
                    setLanguage(event.currentTarget.value as LanguageType | "")
                  }
                  className={SELECT_CLASS}
                >
                  <option value="" disabled>
                    Pick a language…
                  </option>
                  {LANGUAGE_TYPES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {needsCategory && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="classify-category">Category</Label>
                <select
                  id="classify-category"
                  name="category"
                  value={category}
                  onChange={(event) =>
                    setCategory(event.currentTarget.value as CategoryType | "")
                  }
                  className={SELECT_CLASS}
                >
                  <option value="" disabled>
                    Pick a category…
                  </option>
                  {CATEGORY_TYPES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
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
              Cancel
            </Button>
            <Button type="submit" disabled={busy || incomplete}>
              Save classification
            </Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogPopup>
    </Dialog>
  )
}

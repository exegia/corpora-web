import { useState } from "react"
import { useFetcher } from "react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { CorpusOption } from "@/lib/projects"

export interface LinkCorpusDialogProps {
  options: CorpusOption[]
  disabled?: boolean
}

function LinkOptionRow({ option }: { option: CorpusOption }) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>()
  const busy = fetcher.state !== "idle"

  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="truncate font-medium text-sm">{option.name}</p>
        <p className="truncate text-muted-foreground text-xs">
          {[option.language, option.type].filter(Boolean).join(" · ") || "—"}
        </p>
        {fetcher.data?.ok === false && fetcher.data.error && (
          <p role="alert" className="text-destructive text-xs">
            {fetcher.data.error}
          </p>
        )}
      </div>
      {option.alreadyLinked ? (
        <Badge variant="secondary">Referenced</Badge>
      ) : !option.available ? (
        <Badge variant="secondary">Unavailable</Badge>
      ) : (
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="link-corpus" />
          <input type="hidden" name="corpusId" value={option.id} />
          <Button type="submit" size="sm" variant="outline" disabled={busy}>
            Reference
          </Button>
        </fetcher.Form>
      )}
    </li>
  )
}

/** Pick an existing library corpus to reference from this project. */
export function LinkCorpusDialog({ options, disabled }: LinkCorpusDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size="sm" variant="outline" disabled={disabled} />}
      >
        Add reference
      </DialogTrigger>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Add a corpus reference</DialogTitle>
          <DialogDescription>
            References tell the loader which library corpora belong with this
            dataset — a commentary references the bible version it comments on.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          {options.length === 0 ? (
            <p className="py-4 text-muted-foreground text-sm">
              Your library has no corpora yet. Add corpora in the Library area,
              then reference them here.
            </p>
          ) : (
            <ul className="divide-y">
              {options.map((option) => (
                <LinkOptionRow key={option.id} option={option} />
              ))}
            </ul>
          )}
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  )
}

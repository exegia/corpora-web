import { Trash2, X } from "lucide-react"
import { useState } from "react"
import { useFetcher } from "react-router"
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

/**
 * Typed exactly — case-sensitively — before the delete submits. Matching
 * case-insensitively would defeat the point: the friction is what makes the
 * user read the description first.
 */
const CONFIRM_WORD = "DELETE"

export interface ConfirmDeleteDialogProps {
  title: React.ReactNode
  description: React.ReactNode
  /** Label for the confirming submit button, e.g. "Delete project". */
  confirmLabel: string
  /** Action intent, plus whatever ids that intent needs. */
  intent: string
  fields?: Record<string, string>
  /** Rendered as the trigger; defaults to a destructive "Delete" button. */
  trigger?: React.ReactElement
  /** Trigger text. Overridden entirely when `trigger` has its own children. */
  triggerLabel?: string
}

/**
 * Confirmation gate for irreversible deletes: the user has to type DELETE
 * before the submit button enables. Owns its own fetcher so the pending and
 * error states come for free at every call site.
 */
export function ConfirmDeleteDialog({
  title,
  description,
  confirmLabel,
  intent,
  fields,
  trigger,
  triggerLabel = "Delete",
}: ConfirmDeleteDialogProps) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>()
  const [typed, setTyped] = useState("")
  const busy = fetcher.state !== "idle"
  const confirmed = typed === CONFIRM_WORD
  const error = fetcher.data?.ok === false ? fetcher.data.error : null

  return (
    <AlertDialog
      // Reset on close so a reopened dialog is never pre-confirmed.
      onOpenChange={(open) => {
        if (!open) setTyped("")
      }}
    >
      <AlertDialogTrigger
        render={trigger ?? <Button variant="destructive-outline" size="sm" />}
      >
        <Trash2 aria-hidden="true" className="size-4" />
        {triggerLabel}
      </AlertDialogTrigger>
      <AlertDialogPopup>
        {/* contents: the form must not break the popup's flex column layout. */}
        <fetcher.Form className="contents" method="post">
          <input type="hidden" name="intent" value={intent} />
          {Object.entries(fields ?? {}).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-3 px-6 pb-4 text-left">
            <Field>
              <FieldLabel>
                Type{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-destructive-foreground text-xs">
                  {CONFIRM_WORD}
                </code>{" "}
                in the input below to continue:
              </FieldLabel>
              {/* Destructive tint as a danger affordance, applied with the
                  same tokens as the input's aria-invalid state — but not via
                  aria-invalid itself, which would announce an untouched empty
                  field as invalid and fire the shake animation on every open.
                  className lands on the wrapper (data-slot=input-control). */}
              <Input
                autoCapitalize="none"
                autoComplete="off"
                className="w-full border-destructive ring-destructive/24 has-focus-visible:border-destructive/64 [&_input]:placeholder:text-destructive/40"
                onChange={(event) => setTyped(event.currentTarget.value)}
                placeholder={CONFIRM_WORD}
                spellCheck={false}
                type="text"
                value={typed}
              />
            </Field>
            {error && (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button type="button" variant="outline" />}>
              <X aria-hidden="true" className="size-4" />
              Cancel
            </AlertDialogClose>
            <Button
              disabled={!confirmed || busy}
              type="submit"
              variant="destructive"
            >
              <Trash2 aria-hidden="true" className="size-4" />
              {confirmLabel}
            </Button>
          </AlertDialogFooter>
        </fetcher.Form>
      </AlertDialogPopup>
    </AlertDialog>
  )
}

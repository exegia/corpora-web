import { BookMarked } from "lucide-react"
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import type { ProjectReference } from "@/lib/projects"
import { ReferenceFormDialog } from "@/components/project/reference-form"

function DeleteReferenceDialog({ reference }: { reference: ProjectReference }) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>()
  const busy = fetcher.state !== "idle"

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button size="sm" variant="ghost" />}>
        Delete
      </AlertDialogTrigger>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this reference?</AlertDialogTitle>
          <AlertDialogDescription>
            “{reference.title}” will be removed from the project.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {fetcher.data?.ok === false && fetcher.data.error && (
          <p role="alert" className="px-6 text-destructive text-sm">
            {fetcher.data.error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="outline" />}>
            Cancel
          </AlertDialogClose>
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="delete-reference" />
            <input type="hidden" name="referenceId" value={reference.id} />
            <Button type="submit" variant="destructive" disabled={busy}>
              Delete reference
            </Button>
          </fetcher.Form>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  )
}

function ReferenceRow({ reference }: { reference: ProjectReference }) {
  const [editing, setEditing] = useState(false)
  const meta = [
    reference.authors,
    reference.year?.toString(),
    reference.publication,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-sm">{reference.title}</p>
        <p className="truncate text-muted-foreground text-xs">
          {meta || "No details"}
          {reference.url && (
            <>
              {meta && " · "}
              <a
                href={reference.url}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                Source
              </a>
            </>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
          Edit
        </Button>
        <DeleteReferenceDialog reference={reference} />
      </div>
      <ReferenceFormDialog
        open={editing}
        onOpenChange={setEditing}
        reference={reference}
      />
    </li>
  )
}

export function ReferenceList({ references }: { references: ProjectReference[] }) {
  if (references.length === 0) {
    return (
      <Empty className="py-8 md:py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookMarked />
          </EmptyMedia>
          <EmptyTitle>No references</EmptyTitle>
          <EmptyDescription>
            Use “Add reference” to collect citations for this project.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ul className="divide-y">
      {references.map((reference) => (
        <ReferenceRow key={reference.id} reference={reference} />
      ))}
    </ul>
  )
}

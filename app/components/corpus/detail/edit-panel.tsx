import { X } from "lucide-react"
import { useState, type FormEvent } from "react"
import { useRevalidator } from "react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import CorporaApi, { type ManifestUpdate } from "@/lib/api"
import Corpus from "@/lib/corpus"
import type { EditPanelProps } from "./types"

/** Right-panel form for ManifestUpdate-safe corpus metadata. */
export default function EditPanel({ document, onClose }: EditPanelProps) {
  const { revalidate } = useRevalidator()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = new FormData(event.currentTarget)
    const name = String(form.get("name") ?? "").trim()
    const description = String(form.get("description") ?? "").trim()
    const language = String(form.get("language") ?? "").trim()
    const languageCode = String(form.get("languageCode") ?? "").trim()
    if (!name) {
      setError("A corpus name is required.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const updates: ManifestUpdate = { name, description, language }
      if (languageCode) updates.languageCode = languageCode
      const jobId = document.jobId?.trim()
      if (jobId) await CorporaApi.patchJobManifest(jobId, updates)
      await Corpus.Documents.updateCorpusDocument(document.id, {
        name,
        description: description || null,
        language: language || null,
      })
      revalidate()
      onClose()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save the corpus.",
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="sticky top-0 z-10 flex items-start justify-between gap-2 bg-background px-4 pt-4 pb-3">
        <h2 className="font-heading text-lg leading-none font-semibold">
          Edit corpus
        </h2>
        <Button
          aria-label="Close edit panel"
          className="-me-1.5 -mt-1.5"
          disabled={busy}
          onClick={onClose}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <X />
        </Button>
      </header>
      <form
        className="flex min-h-0 flex-1 flex-col gap-4 p-4 pt-0"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="corpus-edit-name">Name</Label>
          <Input
            aria-required
            defaultValue={document.name}
            disabled={busy}
            id="corpus-edit-name"
            name="name"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="corpus-edit-description">Description</Label>
          <Input
            defaultValue={document.description ?? ""}
            disabled={busy}
            id="corpus-edit-description"
            name="description"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="corpus-edit-language">Language</Label>
          <Input
            defaultValue={document.language ?? ""}
            disabled={busy}
            id="corpus-edit-language"
            name="language"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="corpus-edit-language-code">Language code</Label>
          <Input
            disabled={busy}
            id="corpus-edit-language-code"
            name="languageCode"
            placeholder="en"
          />
        </div>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-auto flex items-center justify-end gap-2">
          <Button
            disabled={busy}
            onClick={onClose}
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button disabled={busy} type="submit">
            {busy ? <Spinner /> : null}
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </div>
  )
}

import { useEffect, useRef, useState } from "react"
import { useFetcher } from "react-router"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select"
import { STATUS_OPTIONS } from "@/components/licenses/utils"
import type { LicenceDetail } from "@/lib/licenses"
import type { LicenseStatus } from "@/lib/projects"

/** Superadmin-only edit form for the catalog entry's stored fields. */
export default function LicenceEditForm({
  licence,
  onDone,
}: {
  licence: LicenceDetail
  onDone: () => void
}) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>()
  const busy = fetcher.state !== "idle"
  const submittedRef = useRef(false)
  const [status, setStatus] = useState<LicenseStatus>(licence.status)
  const [domains, setDomains] = useState(licence.domains)

  // Leave edit mode only once the save lands; a failed save keeps the form
  // open with its error visible.
  useEffect(() => {
    if (submittedRef.current && fetcher.state === "idle" && fetcher.data?.ok) {
      submittedRef.current = false
      onDone()
    }
  }, [fetcher.state, fetcher.data, onDone])

  return (
    <fetcher.Form
      method="post"
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        const form = new FormData(event.currentTarget)
        event.preventDefault()
        submittedRef.current = true
        fetcher.submit(
          {
            intent: "update-licence",
            title: String(form.get("title") ?? ""),
            url: String(form.get("url") ?? ""),
            family: String(form.get("family") ?? ""),
            maintainer: String(form.get("maintainer") ?? ""),
            status,
            domainContent: String(domains.content),
            domainData: String(domains.data),
            domainSoftware: String(domains.software),
          },
          { method: "post" },
        )
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="licence-title">Title</Label>
          <Input
            id="licence-title"
            name="title"
            defaultValue={licence.title}
            aria-required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="licence-status">Status</Label>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as LicenseStatus)}
          >
            <SelectTrigger className="w-full" id="licence-status">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="licence-family">Family</Label>
          <Input id="licence-family" name="family" defaultValue={licence.family ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="licence-maintainer">Maintainer</Label>
          <Input
            id="licence-maintainer"
            name="maintainer"
            defaultValue={licence.maintainer ?? ""}
          />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="licence-url">URL</Label>
          <Input
            id="licence-url"
            name="url"
            type="url"
            defaultValue={licence.url ?? ""}
            placeholder="https://…"
          />
        </div>
        <fieldset className="flex flex-col gap-2 sm:col-span-2">
          <legend className="font-medium text-sm">Domains</legend>
          <div className="mt-1 flex flex-wrap gap-x-6 gap-y-2">
            {(
              [
                ["content", "Content"],
                ["data", "Data"],
                ["software", "Software"],
              ] as const
            ).map(([key, label]) => (
              <Label key={key} className="flex items-center gap-2 font-normal">
                <Checkbox
                  checked={domains[key]}
                  onCheckedChange={(checked) =>
                    setDomains((current) => ({ ...current, [key]: checked === true }))
                  }
                />
                {label}
              </Label>
            ))}
          </div>
        </fieldset>
      </div>
      {fetcher.data?.ok === false && fetcher.data.error && (
        <p role="alert" className="text-destructive text-sm">
          {fetcher.data.error}
        </p>
      )}
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy && <Spinner />}
          {busy ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </fetcher.Form>
  )
}

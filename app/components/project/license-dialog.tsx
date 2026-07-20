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
import type { CatalogLicense } from "@/lib/licenses"

function domainBadges(license: CatalogLicense) {
  const domains: string[] = []
  if (license.domains.content) domains.push("content")
  if (license.domains.data) domains.push("data")
  if (license.domains.software) domains.push("software")
  return domains
}

function CatalogRow({
  license,
  attached,
  agreedByUserId,
}: {
  license: CatalogLicense
  attached: boolean
  agreedByUserId: string
}) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>()
  const [confirming, setConfirming] = useState(false)
  const busy = fetcher.state !== "idle"
  const discouraged = license.status !== "active"

  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-sm">
            {license.url ? (
              <a
                href={license.url}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 hover:underline"
              >
                {license.title}
              </a>
            ) : (
              license.title
            )}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1 text-muted-foreground text-xs">
            {discouraged && <Badge variant="destructive">{license.status}</Badge>}
            {domainBadges(license).map((domain) => (
              <Badge key={domain} variant="outline">
                {domain}
              </Badge>
            ))}
            {license.family && <span>{license.family}</span>}
          </p>
          {fetcher.data?.ok === false && fetcher.data.error && (
            <p role="alert" className="text-destructive text-xs">
              {fetcher.data.error}
            </p>
          )}
        </div>
        {attached ? (
          <Badge variant="secondary">Attached</Badge>
        ) : confirming ? (
          <fetcher.Form
            method="post"
            onSubmit={() => setConfirming(false)}
            className="flex shrink-0 items-center gap-1"
          >
            <input type="hidden" name="intent" value="attach-license" />
            <input type="hidden" name="licenseId" value={license.id} />
            <input type="hidden" name="agreedByUserId" value={agreedByUserId} />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              Agree & attach
            </Button>
          </fetcher.Form>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setConfirming(true)}
          >
            Attach
          </Button>
        )}
      </div>
      {confirming && !attached && (
        <p className="text-muted-foreground text-xs">
          By attaching, you agree to apply “{license.title}” to this project.
          The agreement time and your user are recorded.
        </p>
      )}
    </li>
  )
}

export interface LicenseDialogProps {
  catalog: CatalogLicense[]
  attachedIds: string[]
  /** Agreeing user — the project's creator until corpora-auth ships (FR-012). */
  agreedByUserId: string
}

/** Browse the seeded catalog and attach with an explicit agreement step (US3). */
export function LicenseDialog({
  catalog,
  attachedIds,
  agreedByUserId,
}: LicenseDialogProps) {
  const [open, setOpen] = useState(false)
  const attached = new Set(attachedIds)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        Add license
      </DialogTrigger>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Attach a license</DialogTitle>
          <DialogDescription>
            Pick a license from the catalog. Retired or superseded licenses are
            marked — prefer active ones.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          {catalog.length === 0 ? (
            <p className="py-4 text-muted-foreground text-sm">
              No licenses are available yet — the license catalog has not been
              seeded. The rest of the project keeps working without one.
            </p>
          ) : (
            <ul className="divide-y">
              {catalog.map((license) => (
                <CatalogRow
                  key={license.id}
                  license={license}
                  attached={attached.has(license.id)}
                  agreedByUserId={agreedByUserId}
                />
              ))}
            </ul>
          )}
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  )
}

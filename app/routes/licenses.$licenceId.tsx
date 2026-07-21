import { FileQuestion } from "lucide-react"
import { marked } from "marked"
import { useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { Link, useFetcher, useLoaderData } from "react-router"
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardFrame,
  CardFrameAction,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDate } from "@/lib/format"
import { getLicence, type LicenceDetail, updateLicence } from "@/lib/licenses"
import { DataError, type LicenseStatus } from "@/lib/projects"
import { getSuperadmin } from "@/lib/users"

export async function clientLoader({ params }: LoaderFunctionArgs) {
  const licenceId = params.licenceId ?? ""
  const [licence, superadmin] = await Promise.all([
    getLicence(licenceId),
    getSuperadmin(),
  ])
  return {
    licence,
    // Pre-auth: the session acts as the superadmin when the directory has one.
    superadmin: superadmin !== null,
  }
}

export async function clientAction({ request, params }: ActionFunctionArgs) {
  const licenceId = params.licenceId ?? ""
  const form = await request.formData()
  const intent = String(form.get("intent") ?? "")
  try {
    switch (intent) {
      case "update-licence": {
        // Pre-auth guard (research R4): only the superadmin edits the catalog.
        if ((await getSuperadmin()) === null) {
          return { ok: false, error: "Only the superadmin can edit licences." }
        }
        await updateLicence(licenceId, {
          title: String(form.get("title") ?? ""),
          url: String(form.get("url") ?? "") || null,
          family: String(form.get("family") ?? "") || null,
          maintainer: String(form.get("maintainer") ?? "") || null,
          status: String(form.get("status") ?? "active") as LicenseStatus,
          domains: {
            content: form.get("domainContent") === "true",
            data: form.get("domainData") === "true",
            software: form.get("domainSoftware") === "true",
          },
        })
        return { ok: true, intent }
      }
      default:
        return { ok: false, error: "Unknown action." }
    }
  } catch (error) {
    if (error instanceof DataError) {
      return { ok: false, error: error.message }
    }
    return { ok: false, error: "Something went wrong. Your change was not saved." }
  }
}

const STATUS_OPTIONS: LicenseStatus[] = ["active", "retired", "superseded"]

function domainList(licence: LicenceDetail): string[] {
  const domains: string[] = []
  if (licence.domains.content) domains.push("content")
  if (licence.domains.data) domains.push("data")
  if (licence.domains.software) domains.push("software")
  return domains
}

/** The licence rendered as markdown — the document view of the record. */
function licenceMarkdown(licence: LicenceDetail): string {
  const lines = [
    `# ${licence.title}`,
    "",
    `**Identifier:** \`${licence.id}\``,
    `**Status:** ${licence.status}`,
    `**Domains:** ${domainList(licence).join(", ") || "—"}`,
  ]
  if (licence.family) lines.push(`**Family:** ${licence.family}`)
  if (licence.maintainer) lines.push(`**Maintainer:** ${licence.maintainer}`)
  if (licence.odConformance)
    lines.push(`**Open Definition conformance:** ${licence.odConformance}`)
  if (licence.osdConformance)
    lines.push(`**Open Source Definition conformance:** ${licence.osdConformance}`)
  if (licence.isGeneric) lines.push(`**Generic licence** (not version-specific)`)
  if (licence.legacyIds.length > 0)
    lines.push(`**Legacy identifiers:** ${licence.legacyIds.join(", ")}`)
  if (licence.url) lines.push("", `[Read the full licence text](${licence.url})`)
  return lines.join("\n")
}

function LicenceMarkdownView({ licence }: { licence: LicenceDetail }) {
  const html = useMemo(
    () => marked.parse(licenceMarkdown(licence), { async: false }),
    [licence],
  )
  return (
    <div
      className="text-sm [&_a]:underline [&_a]:underline-offset-2 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_h1]:font-heading [&_h1]:font-semibold [&_h1]:text-xl [&_p]:mt-2 first:[&_p]:mt-0"
      // Our own generated markdown — no user-provided HTML flows through here.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-medium">{label}</dt>
      <dd className="text-muted-foreground">{children}</dd>
    </div>
  )
}

/** Read-only field grid, shown to everyone. */
function LicenceDetailView({ licence }: { licence: LicenceDetail }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
      <DetailField label="Identifier">{licence.id}</DetailField>
      <DetailField label="Status">
        <Badge variant={licence.status === "active" ? "secondary" : "destructive"}>
          {licence.status}
        </Badge>
      </DetailField>
      <DetailField label="Domains">
        <span className="flex flex-wrap gap-1">
          {domainList(licence).length === 0
            ? "—"
            : domainList(licence).map((domain) => (
                <Badge key={domain} variant="outline">
                  {domain}
                </Badge>
              ))}
        </span>
      </DetailField>
      <DetailField label="Family">{licence.family ?? "—"}</DetailField>
      <DetailField label="Maintainer">{licence.maintainer ?? "—"}</DetailField>
      <DetailField label="URL">
        {licence.url ? (
          <a
            href={licence.url}
            target="_blank"
            rel="noreferrer"
            className="break-all underline-offset-2 hover:underline"
          >
            {licence.url}
          </a>
        ) : (
          "—"
        )}
      </DetailField>
      <DetailField label="Open Definition">
        {licence.odConformance ?? "not reviewed"}
      </DetailField>
      <DetailField label="Open Source Definition">
        {licence.osdConformance ?? "not reviewed"}
      </DetailField>
      <DetailField label="Dates">
        Added {formatDate(licence.createdAt)}
        {licence.updatedAt && ` · updated ${formatDate(licence.updatedAt)}`}
      </DetailField>
    </dl>
  )
}

/** Superadmin-only edit form for the catalog entry's stored fields. */
function LicenceEditForm({
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
          Save changes
        </Button>
      </div>
    </fetcher.Form>
  )
}

function LicenceNotFound() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileQuestion />
        </EmptyMedia>
        <EmptyTitle>This licence does not exist</EmptyTitle>
        <EmptyDescription>
          It may have been removed from the catalog.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button render={<Link to="/licenses" />}>Back to licenses</Button>
      </EmptyContent>
    </Empty>
  )
}

/**
 * One catalog licence: the stored detail (editable by the superadmin only)
 * and the licence rendered as markdown.
 */
export default function LicenceDetailPage() {
  const { licence, superadmin } = useLoaderData<typeof clientLoader>()
  const [editing, setEditing] = useState(false)

  if (!licence) return <LicenceNotFound />

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="break-words font-heading text-2xl font-bold">
          {licence.title}
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {[licence.id, licence.family].filter(Boolean).join(" · ")}
        </p>
      </header>

      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle render={<h2 />}>Details</CardFrameTitle>
          {superadmin && !editing && (
            <CardFrameAction>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                Edit
              </Button>
            </CardFrameAction>
          )}
        </CardFrameHeader>
        <Card>
          <CardPanel>
            {editing ? (
              <LicenceEditForm licence={licence} onDone={() => setEditing(false)} />
            ) : (
              <LicenceDetailView licence={licence} />
            )}
          </CardPanel>
        </Card>
      </CardFrame>

      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle render={<h2 />}>License</CardFrameTitle>
        </CardFrameHeader>
        <Card>
          <CardPanel>
            <LicenceMarkdownView licence={licence} />
          </CardPanel>
        </Card>
      </CardFrame>
    </section>
  )
}

import { useState } from "react"
import { useFetcher } from "react-router"
import { ClassifyDialog } from "@/components/project/classify-dialog"
import { LicenseDialog } from "@/components/project/license-dialog"
import { OrganizationDialog } from "@/components/project/organization-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { formatDate, formatRelativeTime } from "@/lib/format"
import type { CatalogLicence } from "@/lib/licenses"
import type { Organization } from "@/lib/organizations"
import {
  type AttachedLicense,
  PROJECT_STATUSES,
  type ProjectDetail,
} from "@/lib/projects"

function AttachedLicenseRow({ license }: { license: AttachedLicense }) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>()
  const busy = fetcher.state !== "idle"

  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="truncate font-medium text-sm">
          {license.title}
          {license.status !== "active" && (
            <Badge variant="destructive" className="ms-2">
              {license.status}
            </Badge>
          )}
        </p>
        <p className="truncate text-muted-foreground text-xs">
          Agreed {formatDate(license.agreedAt)} by{" "}
          {license.agreedBy.name ?? license.agreedBy.username}
        </p>
        {fetcher.data?.ok === false && fetcher.data.error && (
          <p role="alert" className="text-destructive text-xs">
            {fetcher.data.error}
          </p>
        )}
      </div>
      <fetcher.Form method="post" className="shrink-0">
        <input type="hidden" name="intent" value="detach-license" />
        <input type="hidden" name="licenseId" value={license.id} />
        <Button type="submit" size="sm" variant="ghost" disabled={busy}>
          Remove
        </Button>
      </fetcher.Form>
    </li>
  )
}

export interface ProjectDetailPanelProps {
  project: ProjectDetail
  licenseCatalog: CatalogLicence[]
  organizations: Organization[]
}

/** Project metadata card (002, SC-001): every detail field in one view. */
export function ProjectDetailPanel({
  project,
  licenseCatalog,
  organizations,
}: ProjectDetailPanelProps) {
  const statusFetcher = useFetcher<{ ok: boolean; error?: string }>()
  const orgClearFetcher = useFetcher<{ ok: boolean; error?: string }>()
  const [classifying, setClassifying] = useState(false)
  const [editingOrganization, setEditingOrganization] = useState(false)

  const classification = [project.type, project.language ?? project.category]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="rounded-lg border p-4">
      <h2 className="font-heading font-semibold text-lg">Details</h2>
      <dl className="mt-3 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt>
            <Label htmlFor="project-status">Status</Label>
          </dt>
          <dd>
            <select
              id="project-status"
              name="status"
              value={project.status}
              disabled={statusFetcher.state !== "idle"}
              onChange={(event) =>
                statusFetcher.submit(
                  { intent: "set-status", status: event.currentTarget.value },
                  { method: "post" },
                )
              }
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {PROJECT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            {statusFetcher.data?.ok === false && statusFetcher.data.error && (
              <p role="alert" className="mt-1 text-destructive text-xs">
                {statusFetcher.data.error}
              </p>
            )}
          </dd>
        </div>

        <div className="flex flex-col gap-1">
          <dt className="font-medium">Classification</dt>
          <dd className="flex items-center justify-between gap-2">
            <span className={classification ? "" : "text-muted-foreground"}>
              {classification || "Unclassified"}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setClassifying(true)}
            >
              Classify
            </Button>
          </dd>
        </div>

        <div className="flex flex-col gap-1">
          <dt className="font-medium">Creator</dt>
          <dd>{project.creator.name ?? project.creator.username}</dd>
        </div>

        <div className="flex flex-col gap-1">
          <dt className="font-medium">Organization</dt>
          <dd className="flex items-center justify-between gap-2">
            {project.organization ? (
              <span className="min-w-0 truncate">
                {project.organization.name}
                {project.organization.website && (
                  <>
                    {" · "}
                    <a
                      href={project.organization.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground underline-offset-2 hover:underline"
                    >
                      {project.organization.website}
                    </a>
                  </>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">No organization</span>
            )}
            <span className="flex shrink-0 items-center gap-1">
              {project.organization && (
                <orgClearFetcher.Form method="post">
                  <input type="hidden" name="intent" value="set-organization" />
                  <input type="hidden" name="organizationId" value="" />
                  <Button
                    type="submit"
                    size="sm"
                    variant="ghost"
                    disabled={orgClearFetcher.state !== "idle"}
                  >
                    Remove
                  </Button>
                </orgClearFetcher.Form>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingOrganization(true)}
              >
                {project.organization ? "Change" : "Assign"}
              </Button>
            </span>
          </dd>
          {orgClearFetcher.data?.ok === false && orgClearFetcher.data.error && (
            <p role="alert" className="text-destructive text-xs">
              {orgClearFetcher.data.error}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <dt className="font-medium">Dates</dt>
          <dd className="text-muted-foreground">
            Created {formatDate(project.createdAt)} · updated{" "}
            <span title={project.updatedAt}>
              {formatRelativeTime(project.updatedAt)}
            </span>
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-medium text-sm">Licenses</h3>
          <LicenseDialog
            catalog={licenseCatalog}
            attachedIds={project.licenses.map((license) => license.id)}
            agreedByUserId={project.creator.id}
          />
        </div>
        {project.licenses.length === 0 ? (
          <p className="py-2 text-muted-foreground text-sm">
            No licenses attached. A project is valid without one — attach
            licenses from the catalog when you are ready.
          </p>
        ) : (
          <ul className="divide-y">
            {project.licenses.map((license) => (
              <AttachedLicenseRow key={license.id} license={license} />
            ))}
          </ul>
        )}
      </div>

      <ClassifyDialog
        open={classifying}
        onOpenChange={setClassifying}
        current={{
          type: project.type,
          language: project.language,
          category: project.category,
        }}
      />
      <OrganizationDialog
        open={editingOrganization}
        onOpenChange={setEditingOrganization}
        organizations={organizations}
        currentId={project.organization?.id ?? null}
      />
    </div>
  )
}

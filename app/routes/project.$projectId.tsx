import { FolderX, Plus } from "lucide-react"
import { useState } from "react"
import { Link, redirect, useLoaderData } from "react-router"
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router"
import { CorpusLinkList } from "@/components/project/corpus-link-list"
import { DeleteProjectDialog } from "@/components/project/delete-project-dialog"
import { LinkCorpusDialog } from "@/components/project/link-corpus-dialog"
import { ProjectDetailPanel } from "@/components/project/project-detail-panel"
import { ProjectFormDialog } from "@/components/project/project-form-dialog"
import { ReferenceFormDialog } from "@/components/project/reference-form"
import { ReferenceList } from "@/components/project/reference-list"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { formatDate, formatRelativeTime } from "@/lib/format"
import { attachLicence, detachLicence, listLicences } from "@/lib/licenses"
import { createOrganization, listOrganizations } from "@/lib/organizations"
import {
  type BookType,
  CATEGORIZED_TYPES,
  type CategoryType,
  type Classification,
  classifyProject,
  createReference,
  DataError,
  deleteProject,
  deleteReference,
  getProject,
  type LanguageType,
  linkCorpus,
  listCorpusOptions,
  type ProjectStatus,
  type ReferenceInput,
  SCRIPTURAL_TYPES,
  setProjectOrganization,
  unlinkCorpus,
  updateProject,
  updateProjectStatus,
  updateReference,
} from "@/lib/projects"

export async function clientLoader({ params }: LoaderFunctionArgs) {
  const projectId = params.projectId ?? ""
  const project = await getProject(projectId)
  const [corpusOptions, licenseCatalog, organizations] = project
    ? await Promise.all([
        listCorpusOptions(projectId),
        listLicences(),
        listOrganizations(),
      ])
    : [[], [], []]
  return { project, corpusOptions, licenseCatalog, organizations }
}

/** Build the discriminated Classification from form fields (FR-006..FR-009). */
function parseClassification(form: FormData): Classification {
  const type = String(form.get("type") ?? "")
  if (!type) return null
  if ((SCRIPTURAL_TYPES as readonly string[]).includes(type)) {
    return {
      type: type as (typeof SCRIPTURAL_TYPES)[number],
      language: String(form.get("language") ?? "") as LanguageType,
    }
  }
  if ((CATEGORIZED_TYPES as readonly string[]).includes(type)) {
    return {
      type: type as (typeof CATEGORIZED_TYPES)[number],
      category: String(form.get("category") ?? "") as CategoryType,
    }
  }
  return { type: type as BookType } as Classification
}

function parseReferenceInput(form: FormData): ReferenceInput {
  const yearRaw = String(form.get("year") ?? "").trim()
  const year = yearRaw ? Number(yearRaw) : undefined
  if (year !== undefined && !Number.isInteger(year)) {
    throw new DataError("validation", "Year must be a whole number.")
  }
  return {
    title: String(form.get("title") ?? ""),
    authors: String(form.get("authors") ?? ""),
    year,
    publication: String(form.get("publication") ?? ""),
    url: String(form.get("url") ?? ""),
  }
}

export async function clientAction({ request, params }: ActionFunctionArgs) {
  const projectId = params.projectId ?? ""
  const form = await request.formData()
  const intent = String(form.get("intent") ?? "")
  try {
    switch (intent) {
      case "update-project":
        await updateProject(projectId, {
          name: String(form.get("name") ?? ""),
          description: String(form.get("description") ?? ""),
        })
        return { ok: true, intent }
      case "delete-project":
        await deleteProject(projectId)
        return redirect("/project")
      case "set-status":
        await updateProjectStatus(
          projectId,
          String(form.get("status") ?? "") as ProjectStatus,
        )
        return { ok: true, intent }
      case "classify":
        await classifyProject(projectId, parseClassification(form))
        return { ok: true, intent }
      case "attach-license":
        await attachLicence(
          projectId,
          String(form.get("licenseId") ?? ""),
          // Pre-auth: the project's creator is the agreeing user (plan Constraints)
          String(form.get("agreedByUserId") ?? ""),
        )
        return { ok: true, intent }
      case "detach-license":
        await detachLicence(projectId, String(form.get("licenseId") ?? ""))
        return { ok: true, intent }
      case "set-organization": {
        const organizationId = String(form.get("organizationId") ?? "")
        await setProjectOrganization(projectId, organizationId || null)
        return { ok: true, intent }
      }
      case "create-organization": {
        const organization = await createOrganization({
          name: String(form.get("name") ?? ""),
          website: String(form.get("website") ?? ""),
        })
        await setProjectOrganization(projectId, organization.id)
        return { ok: true, intent }
      }
      case "link-corpus":
        await linkCorpus(projectId, String(form.get("corpusId") ?? ""))
        return { ok: true, intent }
      case "unlink-corpus":
        await unlinkCorpus(projectId, String(form.get("corpusId") ?? ""))
        return { ok: true, intent }
      case "create-reference":
        await createReference(projectId, parseReferenceInput(form))
        return { ok: true, intent }
      case "update-reference":
        await updateReference(
          String(form.get("referenceId") ?? ""),
          parseReferenceInput(form),
        )
        return { ok: true, intent }
      case "delete-reference":
        await deleteReference(String(form.get("referenceId") ?? ""))
        return { ok: true, intent }
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

function ProjectNotFound() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderX />
        </EmptyMedia>
        <EmptyTitle>This project no longer exists</EmptyTitle>
        <EmptyDescription>
          It may have been deleted in another session.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button render={<Link to="/project" />}>Back to projects</Button>
      </EmptyContent>
    </Empty>
  )
}

export default function ProjectWorkspace() {
  const { project, corpusOptions, licenseCatalog, organizations } =
    useLoaderData<typeof clientLoader>()
  const [editing, setEditing] = useState(false)
  const [addingReference, setAddingReference] = useState(false)

  if (!project) return <ProjectNotFound />

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="break-words font-heading font-bold text-2xl">
            {project.name}
          </h1>
          {project.description && (
            <p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">
              {project.description}
            </p>
          )}
          <p className="mt-1 text-muted-foreground text-xs">
            Created {formatDate(project.createdAt)} · updated{" "}
            {formatRelativeTime(project.updatedAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <DeleteProjectDialog
            project={{ id: project.id, name: project.name }}
          />
        </div>
      </header>

      <ProjectDetailPanel
        project={project}
        licenseCatalog={licenseCatalog}
        organizations={organizations}
      />

      <Separator />

      <div>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading font-semibold text-lg">Corpora</h2>
          <LinkCorpusDialog options={corpusOptions} />
        </div>
        <CorpusLinkList corpora={project.corpora} />
      </div>

      <Separator />

      <div>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading font-semibold text-lg">References</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAddingReference(true)}
          >
            <Plus /> Add reference
          </Button>
        </div>
        <ReferenceList references={project.references} />
      </div>

      <ProjectFormDialog
        open={editing}
        onOpenChange={setEditing}
        project={{
          id: project.id,
          name: project.name,
          description: project.description,
        }}
      />
      <ReferenceFormDialog
        open={addingReference}
        onOpenChange={setAddingReference}
      />
    </section>
  )
}

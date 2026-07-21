import { FolderX } from "lucide-react"
import { useState } from "react"
import { Link, redirect, useLoaderData } from "react-router"
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router"
import { CorpusLinkList } from "@/components/project/corpus-link-list"
import { CorpusSection } from "@/components/project/corpus-section"
import { DeleteProjectDialog } from "@/components/project/delete-project-dialog"
import { LinkCorpusDialog } from "@/components/project/link-corpus-dialog"
import { ProjectDetailPanel } from "@/components/project/project-detail-panel"
import { ProjectFormDialog } from "@/components/project/project-form-dialog"
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
import { detachProjectCorpus, setProjectCorpus } from "@/lib/corpus"
import type { CorpusCommitInput } from "@/lib/corpus"
import { formatDate, formatRelativeTime } from "@/lib/format"
import { attachLicence, detachLicence, listLicences } from "@/lib/licenses"
import { createOrganization, listOrganizations } from "@/lib/organizations"
import {
  assertEditable,
  type BookType,
  CATEGORIZED_TYPES,
  type CategoryType,
  type Classification,
  classifyProject,
  type CorpusSource,
  DataError,
  deleteProject,
  getProject,
  isProjectReadOnly,
  type LanguageType,
  linkCorpus,
  listCorpusOptions,
  type ProjectStatus,
  SCRIPTURAL_TYPES,
  setProjectOrganization,
  unlinkCorpus,
  updateProject,
  updateProjectStatus,
} from "@/lib/projects"
import { getSuperadmin } from "@/lib/users"

export async function clientLoader({ params }: LoaderFunctionArgs) {
  const projectId = params.projectId ?? ""
  const project = await getProject(projectId)
  const [corpusOptions, licenseCatalog, organizations, superadmin] = project
    ? await Promise.all([
        listCorpusOptions(projectId),
        listLicences(),
        listOrganizations(),
        getSuperadmin(),
      ])
    : [[], [], [], null]
  return {
    project,
    corpusOptions,
    licenseCatalog,
    organizations,
    // Pre-auth: the session acts as the superadmin when the directory has one.
    superadmin: superadmin !== null,
  }
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

function parseCommits(raw: string): CorpusCommitInput[] {
  try {
    const parsed = JSON.parse(raw || "[]")
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (commit): commit is CorpusCommitInput =>
        typeof commit?.sha === "string" && typeof commit?.message === "string",
    )
  } catch {
    return []
  }
}

export async function clientAction({ request, params }: ActionFunctionArgs) {
  const projectId = params.projectId ?? ""
  const form = await request.formData()
  const intent = String(form.get("intent") ?? "")
  try {
    // A project in review is read-only for everything except the status
    // decision itself (superadmin approve / return).
    if (intent !== "set-status") {
      await assertEditable(projectId)
    }
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
      case "set-status": {
        const project = await getProject(projectId)
        if (!project) {
          throw new DataError("not-found", "This project no longer exists.")
        }
        const superadmin = (await getSuperadmin()) !== null
        await updateProjectStatus(
          project,
          String(form.get("status") ?? "") as ProjectStatus,
          superadmin,
        )
        return { ok: true, intent }
      }
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
      case "attach-corpus":
        await setProjectCorpus(projectId, {
          source: String(form.get("source") ?? "upload") as CorpusSource,
          path: String(form.get("path") ?? ""),
          filename: String(form.get("filename") ?? "") || null,
          commits: parseCommits(String(form.get("commits") ?? "[]")),
        })
        return { ok: true, intent }
      case "detach-corpus":
        await detachProjectCorpus(projectId)
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
  const { project, corpusOptions, licenseCatalog, organizations, superadmin } =
    useLoaderData<typeof clientLoader>()
  const [editing, setEditing] = useState(false)

  if (!project) return <ProjectNotFound />

  const readOnly = isProjectReadOnly(project.status)

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="break-words font-bold text-2xl capitalize font-sans">
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
        {!readOnly && (
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <DeleteProjectDialog
              project={{ id: project.id, name: project.name }}
            />
          </div>
        )}
      </header>

      <ProjectDetailPanel
        project={project}
        licenseCatalog={licenseCatalog}
        organizations={organizations}
        superadmin={superadmin}
        readOnly={readOnly}
      />

      <Separator />

      <div>
        <h2 className="font-semibold text-lg">Corpus</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          The document this project publishes — a .corpus upload or a Hugging
          Face corpus.
        </p>
        <div className="mt-3">
          <CorpusSection
            projectId={project.id}
            corpus={project.corpus}
            commits={project.commits}
            readOnly={readOnly}
          />
        </div>
      </div>

      <Separator />

      <div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-lg">References</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              Library corpora loaded alongside this dataset.
            </p>
          </div>
          <LinkCorpusDialog options={corpusOptions} disabled={readOnly} />
        </div>
        <CorpusLinkList corpora={project.corpora} readOnly={readOnly} />
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
    </section>
  )
}

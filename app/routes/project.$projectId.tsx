import { FolderX, Plus } from "lucide-react"
import { useState } from "react"
import { Link, redirect, useLoaderData } from "react-router"
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router"
import { CorpusLinkList } from "@/components/project/corpus-link-list"
import { DeleteProjectDialog } from "@/components/project/delete-project-dialog"
import { LinkCorpusDialog } from "@/components/project/link-corpus-dialog"
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
import {
  createReference,
  DataError,
  deleteProject,
  deleteReference,
  getProject,
  linkCorpus,
  listCorpusOptions,
  type ReferenceInput,
  unlinkCorpus,
  updateProject,
  updateReference,
} from "@/lib/projects"

export async function clientLoader({ params }: LoaderFunctionArgs) {
  const projectId = params.projectId ?? ""
  const project = await getProject(projectId)
  const corpusOptions = project ? await listCorpusOptions(projectId) : []
  return { project, corpusOptions }
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
  const { project, corpusOptions } = useLoaderData<typeof clientLoader>()
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

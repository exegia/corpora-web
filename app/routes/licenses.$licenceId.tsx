import { Suspense, useState } from "react"
import { Await, useLoaderData } from "react-router"
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardFrame,
  CardFrameAction,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@/components/ui/card"
import { License } from "@/components/licenses"
import Licences from "@/lib/licenses"
import Project, { type LicenseStatus } from "@/lib/projects"
import { getSuperadmin } from "@/lib/user/users"

export async function clientLoader({ params }: LoaderFunctionArgs) {
  const licenceId = params.licenceId ?? ""
  // Both awaited: the breadcrumb reads `licence` off loaderData synchronously
  // (components/breadcrumb), and these are two cheap reads. The licence text is
  // the slow part and keeps its own boundary below.
  const [licence, superadmin] = await Promise.all([
    Licences.Catalog.getLicence(licenceId),
    getSuperadmin(),
  ])
  return {
    licence,
    text: Licences.Text.resolveLicenceText(licence),
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
        await Licences.Authoring.updateLicence(licenceId, {
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
      case "save-licence-text": {
        // Pre-auth guard (research R4): only the superadmin edits the catalog.
        if ((await getSuperadmin()) === null) {
          return { ok: false, error: "Only the superadmin can edit licences." }
        }
        await Licences.Text.saveLicenceText(licenceId, String(form.get("text") ?? ""))
        return { ok: true, intent }
      }
      default:
        return { ok: false, error: "Unknown action." }
    }
  } catch (error) {
    if (error instanceof Project.Errors.DataError) {
      return { ok: false, error: error.message }
    }
    return { ok: false, error: "Something went wrong. Your change was not saved." }
  }
}

/**
 * One catalog licence: the stored detail (editable by the superadmin only)
 * and the licence rendered as markdown.
 */
export default function LicenceDetailPage() {
  const { licence, text, superadmin } = useLoaderData<typeof clientLoader>()
  const [editing, setEditing] = useState(false)

  if (!licence) return <License.NotFound />

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
              <License.EditForm licence={licence} onDone={() => setEditing(false)} />
            ) : (
              <License.DetailView licence={licence} />
            )}
          </CardPanel>
        </Card>
      </CardFrame>

      <Suspense fallback={<License.TextSkeleton />}>
        <Await resolve={text}>
          {(resolved) => (
            <License.TextSection
              licence={licence}
              text={resolved}
              superadmin={superadmin}
            />
          )}
        </Await>
      </Suspense>
    </section>
  )
}

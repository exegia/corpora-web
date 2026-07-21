import { ChevronRight, Scale, SearchIcon } from "lucide-react"
import { Suspense, useState } from "react"
import { Await, Link, redirect, useLoaderData } from "react-router"
import type { ActionFunctionArgs } from "react-router"
import { CreateLicenseDialog } from "@/components/licenses/create-license-dialog"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardFrame,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Skeleton } from "@/components/ui/skeleton"
import {
  type CatalogLicence,
  createLicence,
  listLicences,
} from "@/lib/licenses"
import { useLoadingSound, useReadySound } from "@/lib/sounds"
import { DataError, type LicenseStatus } from "@/lib/projects"
import { getSuperadmin } from "@/lib/users"

export async function clientLoader() {
  // Deliberately not awaited (see routes/project.tsx): navigation completes
  // immediately and the component suspends on this promise, showing the
  // skeleton rows meanwhile.
  const data = Promise.all([listLicences(), getSuperadmin()]).then(
    ([licences, superadmin]) => ({
      licences,
      // Pre-auth: the session acts as the superadmin when the directory has one.
      superadmin: superadmin !== null,
    }),
  )
  return { data }
}

export async function clientAction({ request }: ActionFunctionArgs) {
  const form = await request.formData()
  const intent = String(form.get("intent") ?? "")
  try {
    switch (intent) {
      case "create-licence": {
        // Pre-auth guard (research R4): only the superadmin edits the catalog.
        if ((await getSuperadmin()) === null) {
          return { ok: false, error: "Only the superadmin can create licences." }
        }
        const id = await createLicence({
          id: String(form.get("id") ?? ""),
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
        return redirect(`/licenses/${encodeURIComponent(id)}`)
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

function domainBadges(licence: CatalogLicence) {
  const domains: string[] = []
  if (licence.domains.content) domains.push("content")
  if (licence.domains.data) domains.push("data")
  if (licence.domains.software) domains.push("software")
  return domains
}

function LicenceRow({ licence }: { licence: CatalogLicence }) {
  return (
    <li>
      <Link
        to={`/licenses/${encodeURIComponent(licence.id)}`}
        className="flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/60"
      >
        <div className="flex min-w-0 items-center gap-3">
          <Scale
            aria-hidden="true"
            className="size-5 shrink-0 text-muted-foreground"
          />
          <div className="min-w-0">
            <p className="truncate font-medium text-sm">{licence.title}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-1 text-muted-foreground text-xs">
              {licence.status !== "active" && (
                <Badge variant="destructive">{licence.status}</Badge>
              )}
              {domainBadges(licence).map((domain) => (
                <Badge key={domain} variant="outline">
                  {domain}
                </Badge>
              ))}
              <span>{[licence.id, licence.family].filter(Boolean).join(" · ")}</span>
            </p>
          </div>
        </div>
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
      </Link>
    </li>
  )
}

/** Header + skeleton rows shown while the catalog loads. */
function CatalogSkeleton() {
  useLoadingSound()

  return (
    <>
      <Skeleton className="h-9 w-full max-w-sm rounded-lg" />
      <CardFrame aria-busy="true">
        <CardFrameHeader>
          <CardFrameTitle render={<h2 />}>Catalog</CardFrameTitle>
        </CardFrameHeader>
        <Card>
          <CardPanel className="flex flex-col divide-y">
            {["a", "b", "c", "d", "e"].map((row) => (
              <div key={row} className="flex items-center gap-3 px-2 py-4">
                <Skeleton className="size-5 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </CardPanel>
        </Card>
      </CardFrame>
    </>
  )
}

function Catalog({
  licences,
  superadmin,
}: {
  licences: CatalogLicence[]
  superadmin: boolean
}) {
  useReadySound()
  const [query, setQuery] = useState("")

  const needle = query.trim().toLowerCase()
  const results = needle
    ? licences.filter((licence) =>
        [licence.title, licence.id, licence.family, licence.maintainer]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(needle)),
      )
    : licences

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <InputGroup className="w-full max-w-sm">
          <InputGroupInput
            aria-label="Search licences"
            placeholder="Search licences…"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
          <InputGroupAddon>
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
        </InputGroup>
        {superadmin && <CreateLicenseDialog />}
      </div>

      {licences.length === 0 ? (
        <Empty className="py-10 md:py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Scale />
            </EmptyMedia>
            <EmptyTitle>The licence catalog is empty</EmptyTitle>
            <EmptyDescription>
              The catalog has not been seeded yet.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <CardFrame>
          <CardFrameHeader>
            <CardFrameTitle render={<h2 />}>
              Catalog
              <Badge variant="secondary" className="ms-2">
                {results.length}
              </Badge>
            </CardFrameTitle>
          </CardFrameHeader>
          <Card>
            <CardPanel>
              {results.length === 0 ? (
                <p className="py-4 text-muted-foreground text-sm">
                  No licence matches “{query}”.
                </p>
              ) : (
                <ul className="divide-y">
                  {results.map((licence) => (
                    <LicenceRow key={licence.id} licence={licence} />
                  ))}
                </ul>
              )}
            </CardPanel>
          </Card>
        </CardFrame>
      )}
    </>
  )
}

/** The stored licence catalog: search it and open a licence's detail page. */
export default function Licenses() {
  const { data } = useLoaderData<typeof clientLoader>()

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-2xl font-bold">Licenses</h1>
        <p className="text-muted-foreground mt-2">
          The licence catalog projects attach from. Open a licence to read its
          detail and full description.
        </p>
      </header>

      <Suspense fallback={<CatalogSkeleton />}>
        <Await resolve={data}>
          {({ licences, superadmin }) => (
            <Catalog licences={licences} superadmin={superadmin} />
          )}
        </Await>
      </Suspense>
    </section>
  )
}

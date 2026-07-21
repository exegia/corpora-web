import { ChevronRight, Scale, SearchIcon } from "lucide-react"
import { useState } from "react"
import { Link, useLoaderData } from "react-router"
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
import { type CatalogLicence, listLicences } from "@/lib/licenses"

export async function clientLoader() {
  return { licences: await listLicences() }
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

/** The stored licence catalog: search it and open a licence's detail page. */
export default function Licenses() {
  const { licences } = useLoaderData<typeof clientLoader>()
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
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-2xl font-bold">Licenses</h1>
        <p className="text-muted-foreground mt-2">
          The licence catalog projects attach from. Open a licence to read its
          detail and full description.
        </p>
      </header>

      <InputGroup className="max-w-sm">
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
    </section>
  )
}

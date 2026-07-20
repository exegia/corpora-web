import { LibraryBig } from "lucide-react"
import { useFetcher } from "react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import type { CorpusLink } from "@/lib/projects"

function CorpusLinkRow({ link }: { link: CorpusLink }) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>()
  const busy = fetcher.state !== "idle"
  const stale = link.corpus === null || !link.corpus.available

  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-medium text-sm">
          <span className="truncate">{link.corpus?.name ?? "Removed corpus"}</span>
          {stale && <Badge variant="secondary">Unavailable</Badge>}
        </p>
        <p className="truncate text-muted-foreground text-xs">
          {link.corpus
            ? [link.corpus.language, link.corpus.type, `v${link.corpus.version}`]
                .filter(Boolean)
                .join(" · ")
            : "This corpus is no longer in your library."}
        </p>
        {fetcher.data?.ok === false && fetcher.data.error && (
          <p role="alert" className="text-destructive text-xs">
            {fetcher.data.error}
          </p>
        )}
      </div>
      <fetcher.Form method="post">
        <input type="hidden" name="intent" value="unlink-corpus" />
        <input type="hidden" name="corpusId" value={link.corpusId} />
        <Button type="submit" size="sm" variant="ghost" disabled={busy}>
          {stale ? "Remove" : "Unlink"}
        </Button>
      </fetcher.Form>
    </li>
  )
}

export function CorpusLinkList({ corpora }: { corpora: CorpusLink[] }) {
  if (corpora.length === 0) {
    return (
      <Empty className="py-8 md:py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LibraryBig />
          </EmptyMedia>
          <EmptyTitle>No linked corpora</EmptyTitle>
          <EmptyDescription>
            Use “Link corpus” to attach source texts from your library.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return <ul className="divide-y">{corpora.map((link) => (
    <CorpusLinkRow key={link.corpusId} link={link} />
  ))}</ul>
}

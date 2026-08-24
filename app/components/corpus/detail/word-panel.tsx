import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { Lemma } from "./types"
import { formatCount } from "./utils"

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

/** Inline inspect panel for a highlighted word in the reader. */
export default function WordPanel({
  lemma,
  onClose,
  onViewOccurrences,
}: {
  lemma: Lemma
  onClose: () => void
  onViewOccurrences?: () => void
}) {
  return (
    <aside className="flex min-w-0 flex-col rounded-2xl border">
      <header className="flex items-start justify-between gap-2 border-b px-4 py-3">
        <div className="min-w-0">
          <h3 className="font-heading text-lg font-semibold">{lemma.form}</h3>
          <p className="text-muted-foreground text-xs">
            word · node {formatCount(lemma.node)}
          </p>
        </div>
        <Button
          aria-label="Close word details"
          onClick={onClose}
          size="sm"
          type="button"
          variant="ghost"
        >
          <X />
        </Button>
      </header>
      <div className="flex flex-col gap-4 p-4">
        <section>
          <h4 className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Morphology
          </h4>
          <dl className="flex flex-col gap-2">
            <Row label="Lemma" value={lemma.lemma} />
            <Row label="Part of speech" value={lemma.pos} />
            <Row label="Case" value={lemma.case} />
            <Row label="Gender" value={lemma.gender} />
            <Row label="Number" value={lemma.number} />
          </dl>
        </section>
        <Separator />
        <section>
          <h4 className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Context
          </h4>
          <ol className="flex flex-col gap-1 text-sm">
            {lemma.context.map((crumb, index) => (
              <li
                className={
                  index === lemma.context.length - 1
                    ? "font-medium"
                    : "text-muted-foreground"
                }
                key={crumb}
              >
                {index > 0 ? "› " : null}
                {crumb}
              </li>
            ))}
          </ol>
        </section>
        <Separator />
        <section>
          <h4 className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Occurrences
          </h4>
          <p className="text-sm">
            {formatCount(lemma.occurrences)} in corpus ·{" "}
            {formatCount(lemma.occurrencesInSection)} in this section
          </p>
          {onViewOccurrences && (
            <Button
              className="mt-2 h-auto p-0 text-primary"
              onClick={onViewOccurrences}
              size="sm"
              type="button"
              variant="link"
            >
              View all occurrences →
            </Button>
          )}
        </section>
      </div>
    </aside>
  )
}

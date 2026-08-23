import { useMemo, useState } from "react"
import {
  PreviewCard,
  PreviewCardPopup,
  PreviewCardTrigger,
} from "@/components/ui/preview-card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { DOCTRINA, readerFor } from "./demo-data"
import Panel from "./panel"
import WordPanel from "./word-panel"
import type { Lemma, ReaderPassage } from "./types"
import { formatCount } from "./utils"

const LEMMA_PATTERN = /\bdoctrina\b/gi

function WordToken({
  form,
  lemma,
  onInspect,
}: {
  form: string
  lemma: Lemma
  onInspect: (lemma: Lemma) => void
}) {
  return (
    <PreviewCard>
      <PreviewCardTrigger
        render={
          <button
            className="rounded-sm px-0.5 outline outline-primary"
            onClick={() => onInspect(lemma)}
            type="button"
          />
        }
      >
        {form}
      </PreviewCardTrigger>
      <PreviewCardPopup className="w-64">
        <p className="font-medium">{lemma.lemma}</p>
        <p className="text-muted-foreground text-xs">
          {lemma.posCode} · {lemma.genderCode} · {lemma.numberCode} ·{" "}
          {lemma.caseCode}
        </p>
        <p className="mt-2 text-sm">
          lemma {lemma.lemma} — “{lemma.gloss}”
        </p>
        <p className="text-muted-foreground text-xs">
          {formatCount(lemma.occurrences)} occurrences in corpus
        </p>
        <Button
          className="mt-3 h-auto p-0 text-primary"
          onClick={() => onInspect(lemma)}
          size="sm"
          type="button"
          variant="link"
        >
          View details →
        </Button>
      </PreviewCardPopup>
    </PreviewCard>
  )
}

function PassageText({
  passage,
  onInspect,
}: {
  passage: ReaderPassage
  onInspect: (lemma: Lemma) => void
}) {
  const parts = passage.text.split(LEMMA_PATTERN)
  const matches = passage.text.match(LEMMA_PATTERN) ?? []
  return (
    <p className="text-sm leading-7">
      {parts.map((part, index) => (
        <span key={`${passage.n}-${index}`}>
          {part}
          {matches[index] ? (
            <WordToken
              form={matches[index]}
              lemma={DOCTRINA}
              onInspect={onInspect}
            />
          ) : null}
        </span>
      ))}
    </p>
  )
}

/** Documents tab: contents list + article, with optional word inspect panel. */
export default function Reader({
  sectionTitle,
  onViewOccurrences,
}: {
  sectionTitle: string
  onViewOccurrences?: () => void
}) {
  const reader = useMemo(() => readerFor(sectionTitle), [sectionTitle])
  const [questionId, setQuestionId] = useState(reader.defaultQuestionId)
  const [lemma, setLemma] = useState<Lemma | null>(null)

  const article =
    reader.articles[questionId] ?? reader.articles[reader.defaultQuestionId]

  return (
    <div
      className={cn(
        "grid gap-4",
        lemma
          ? "lg:grid-cols-[16rem_minmax(0,1fr)_18rem]"
          : "lg:grid-cols-[16rem_minmax(0,1fr)]",
      )}
    >
      <Panel bodyClassName="p-2" title="Contents">
        <nav aria-label="Section contents">
          <ul className="flex flex-col">
            {reader.questions.map((question) => {
              const selected = question.id === questionId
              return (
                <li key={question.id}>
                  <button
                    aria-current={selected ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm",
                      selected
                        ? "border-s-2 border-primary bg-muted font-medium"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                    onClick={() => {
                      setQuestionId(question.id)
                      setLemma(null)
                    }}
                    type="button"
                  >
                    {question.title}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      </Panel>

      <article className="min-w-0 rounded-2xl border p-6">
        {article && (
          <>
            <header className="mb-6">
              <h2 className="font-heading text-xl font-semibold">
                {article.heading}
              </h2>
              <p className="mt-1 text-muted-foreground text-sm">
                {article.subtitle}
              </p>
            </header>
            <ol className="flex flex-col gap-6">
              {article.passages.map((passage) => (
                <li className="flex gap-4" key={passage.n}>
                  <span
                    aria-hidden="true"
                    className="w-4 shrink-0 pt-0.5 text-muted-foreground text-xs tabular-nums"
                  >
                    {passage.n}
                  </span>
                  <PassageText onInspect={setLemma} passage={passage} />
                </li>
              ))}
            </ol>
          </>
        )}
      </article>

      {lemma && (
        <WordPanel
          lemma={lemma}
          onClose={() => setLemma(null)}
          onViewOccurrences={onViewOccurrences}
        />
      )}
    </div>
  )
}

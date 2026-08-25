import { useEffect, useState } from "react"
import { BookOpenText } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import type {
  CorpusArchive,
  CorpusNode,
  CorpusPassage,
  PassageToken,
} from "@/lib/api/methods"
import { fetchCorpusContent, fetchCorpusNode } from "@/lib/api/methods"
import { findIndexItem, lemmaFromNode, slotForToken } from "@/lib/corpus/corpus-explore"
import { cn } from "@/lib/utils"
import Panel from "./panel"
import WordPanel from "./word-panel"
import type { Lemma } from "./types"

function placeholderNode(form: string, passage: CorpusPassage, node: number): CorpusNode {
  return {
    node,
    otype: "word",
    is_slot: true,
    slot_type: "word",
    first_slot: node,
    last_slot: node,
    section_ref: passage.ref,
    text: form,
    features: {},
    annotation: null,
    node_types: [],
  }
}

async function inspectTokenNode(
  archive: CorpusArchive,
  passage: CorpusPassage,
  form: string,
  node: number,
): Promise<Lemma> {
  try {
    return lemmaFromNode(await fetchCorpusNode(archive, node), form)
  } catch {
    return lemmaFromNode(placeholderNode(form, passage, node), form)
  }
}

async function inspectSplitToken(
  archive: CorpusArchive,
  passage: CorpusPassage,
  form: string,
  wordIndex: number,
): Promise<Lemma> {
  if (passage.node == null) {
    return lemmaFromNode(placeholderNode(form, passage, 0), form)
  }
  try {
    const container = await fetchCorpusNode(archive, passage.node)
    const slot = slotForToken(container, wordIndex)
    if (slot != null && slot !== container.node) {
      try {
        return lemmaFromNode(await fetchCorpusNode(archive, slot), form)
      } catch {
        return lemmaFromNode(container, form)
      }
    }
    return lemmaFromNode(container, form)
  } catch {
    return lemmaFromNode(placeholderNode(form, passage, passage.node), form)
  }
}

function TokenPassage({
  passage,
  archive,
  index,
  onInspect,
}: {
  passage: CorpusPassage
  archive: CorpusArchive
  index: number
  onInspect: (lemma: Lemma) => void
}) {
  const tokens = passage.tokens ?? []
  return (
    <li className="flex gap-4">
      <span
        aria-hidden="true"
        className="w-4 shrink-0 pt-0.5 text-muted-foreground text-xs tabular-nums"
      >
        {index + 1}
      </span>
      <p className="text-sm leading-7">
        {tokens.map((token, tokenIndex) => (
          <TokenButton
            archive={archive}
            key={`${passage.ref}-${tokenIndex}`}
            onInspect={onInspect}
            passage={passage}
            token={token}
          />
        ))}
      </p>
    </li>
  )
}

function TokenButton({
  archive,
  passage,
  token,
  onInspect,
}: {
  archive: CorpusArchive
  passage: CorpusPassage
  token: PassageToken
  onInspect: (lemma: Lemma) => void
}) {
  return (
    <>
      <button
        className="rounded-sm hover:outline hover:outline-primary"
        onClick={() => {
          if (token.node == null) return
          void inspectTokenNode(archive, passage, token.text, token.node).then(onInspect)
        }}
        type="button"
      >
        {token.text}
      </button>
      {token.after}
    </>
  )
}

function SplitPassage({
  passage,
  archive,
  index,
  onInspect,
}: {
  passage: CorpusPassage
  archive: CorpusArchive
  index: number
  onInspect: (lemma: Lemma) => void
}) {
  const tokens = passage.text.split(/(\s+)/)
  let wordIndex = -1
  return (
    <li className="flex gap-4">
      <span
        aria-hidden="true"
        className="w-4 shrink-0 pt-0.5 text-muted-foreground text-xs tabular-nums"
      >
        {index + 1}
      </span>
      <p className="text-sm leading-7">
        {tokens.map((token, tokenIndex) => {
          if (!token || /^\s+$/.test(token)) return token
          const thisWord = ++wordIndex
          const form = token.replace(/^[^\p{L}\p{M}]+|[^\p{L}\p{M}]+$/gu, "") || token
          return (
            <button
              className="rounded-sm hover:outline hover:outline-primary"
              key={`${passage.ref}-${tokenIndex}`}
              onClick={() => {
                void inspectSplitToken(archive, passage, form, thisWord).then(onInspect)
              }}
              type="button"
            >
              {token}
            </button>
          )
        })}
      </p>
    </li>
  )
}

function LiveReader({
  archive,
  sectionTitle,
  onViewOccurrences,
}: {
  archive: CorpusArchive
  sectionTitle: string
  onViewOccurrences?: () => void
}) {
  const item = findIndexItem(archive.index, sectionTitle)
  const questions = item?.children.length
    ? item.children
    : item
      ? [{ title: item.title, ref: item.ref }]
      : []
  const [selected, setSelected] = useState(questions[0]?.ref ?? item?.ref ?? "")
  const [lemma, setLemma] = useState<Lemma | null>(null)
  const [passages, setPassages] = useState<CorpusPassage[]>([])
  const [loading, setLoading] = useState(Boolean(selected))

  useEffect(() => {
    if (!selected) return
    let cancelled = false
    setLoading(true)
    fetchCorpusContent(archive, { ref: selected, limit: 20 })
      .then((content) => {
        if (!cancelled) setPassages(content.passages)
      })
      .catch(() => {
        if (!cancelled) setPassages([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [archive, selected])

  const heading = questions.find((question) => question.ref === selected)?.title ?? sectionTitle

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
            {questions.map((question) => {
              const isSelected = question.ref === selected
              return (
                <li key={question.ref}>
                  <button
                    aria-current={isSelected ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm",
                      isSelected
                        ? "border-s-2 border-primary bg-muted font-medium"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                    onClick={() => {
                      setSelected(question.ref)
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
        <header className="mb-6">
          <h2 className="font-heading text-xl font-semibold">{heading}</h2>
        </header>
        {loading ? (
          <div aria-label="Loading passages" className="flex flex-col gap-3" role="status">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-5/6" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : (
          <ol className="flex flex-col gap-6">
            {passages.map((passage, index) =>
              passage.tokens?.length ? (
                <TokenPassage
                  archive={archive}
                  index={index}
                  key={`${passage.ref}-${passage.node ?? index}`}
                  onInspect={setLemma}
                  passage={passage}
                />
              ) : (
                <SplitPassage
                  archive={archive}
                  index={index}
                  key={`${passage.ref}-${passage.node ?? index}`}
                  onInspect={setLemma}
                  passage={passage}
                />
              ),
            )}
          </ol>
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

/** Documents tab: live passages from the conversion job or a Hub import. */
export default function Reader({
  sectionTitle,
  archive,
  onViewOccurrences,
}: {
  sectionTitle: string
  archive?: CorpusArchive | null
  onViewOccurrences?: () => void
}) {
  if (archive?.index.sections?.items.length) {
    return (
      <LiveReader
        archive={archive}
        onViewOccurrences={onViewOccurrences}
        sectionTitle={sectionTitle}
      />
    )
  }
  return (
    <Empty className="py-10">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BookOpenText />
        </EmptyMedia>
        <EmptyTitle>No passages yet</EmptyTitle>
        <EmptyDescription>
          No live archive is available for this corpus yet.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

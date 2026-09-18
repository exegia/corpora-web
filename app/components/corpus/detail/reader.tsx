import { useEffect, useRef, useState } from "react"
import { BookOpenText } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { useCorporaApi } from "@/hooks"
// Still imported directly: inspectTokenNode/inspectSplitToken below are
// module-scope, where a hook cannot be called.
import CorporaApi, {
  type CorpusArchive,
  type CorpusNode,
  type CorpusPassage,
  type PassageToken,
} from "@/lib/api"
import Corpus from "@/lib/corpus"
import { cn } from "@/lib/utils"
import Panel from "./panel"
import WordPanel from "./word-panel"
import type { Lemma } from "./types"
import { useReaderSelection } from "../chat/use-reader-selection"

type InspectWord = (load: () => Promise<Lemma>, passage: CorpusPassage, element: HTMLElement, wordNode?: number | null) => void

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
    return Corpus.Explore.lemmaFromNode(await CorporaApi.fetchCorpusNode(archive, node), form)
  } catch {
    return Corpus.Explore.lemmaFromNode(placeholderNode(form, passage, node), form)
  }
}

async function inspectSplitToken(
  archive: CorpusArchive,
  passage: CorpusPassage,
  form: string,
  wordIndex: number,
): Promise<Lemma> {
  if (passage.node == null) {
    return Corpus.Explore.lemmaFromNode(placeholderNode(form, passage, 0), form)
  }
  try {
    const container = await CorporaApi.fetchCorpusNode(archive, passage.node)
    const slot = Corpus.Explore.slotForToken(container, wordIndex)
    if (slot != null && slot !== container.node) {
      try {
        return Corpus.Explore.lemmaFromNode(await CorporaApi.fetchCorpusNode(archive, slot), form)
      } catch {
        return Corpus.Explore.lemmaFromNode(container, form)
      }
    }
    return Corpus.Explore.lemmaFromNode(container, form)
  } catch {
    return Corpus.Explore.lemmaFromNode(placeholderNode(form, passage, passage.node), form)
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
  onInspect: InspectWord
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
      <p className="text-sm leading-7" data-reader-passage={index} tabIndex={-1}>
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
  onInspect: InspectWord
}) {
  return (
    <>
      <button
        className="select-text rounded-sm hover:outline hover:outline-primary"
        data-reader-token=""
        data-reader-node={token.node ?? undefined}
        onClick={(event) => {
          if (window.getSelection()?.toString().trim() || token.node == null) return
          const node = token.node
          onInspect(() => inspectTokenNode(archive, passage, token.text, node), passage, event.currentTarget, node)
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
  onInspect: InspectWord
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
      <p className="text-sm leading-7" data-reader-passage={index} tabIndex={-1}>
        {tokens.map((token, tokenIndex) => {
          if (!token || /^\s+$/.test(token)) return token
          const thisWord = ++wordIndex
          const form = token.replace(/^[^\p{L}\p{M}]+|[^\p{L}\p{M}]+$/gu, "") || token
          return (
            <button
              className="select-text rounded-sm hover:outline hover:outline-primary"
              key={`${passage.ref}-${tokenIndex}`}
              data-reader-token=""
              onClick={(event) => {
                if (window.getSelection()?.toString().trim()) return
                // Text-only responses cannot guarantee one slot per split word.
                // Keep their AI scope on the containing passage.
                onInspect(() => inspectSplitToken(archive, passage, form, thisWord), passage, event.currentTarget)
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
  corpusId,
  archive,
  sectionTitle,
  onViewOccurrences,
}: {
  corpusId: string
  archive: CorpusArchive
  sectionTitle: string
  onViewOccurrences?: () => void
}) {
  const item = Corpus.Explore.findIndexItem(archive.index, sectionTitle)
  const questions = item?.children.length
    ? item.children
    : item
      ? [{ title: item.title, ref: item.ref }]
      : []
  const [selected, setSelected] = useState(questions[0]?.ref ?? item?.ref ?? "")
  const [lemma, setLemma] = useState<Lemma | null>(null)
  const [passages, setPassages] = useState<CorpusPassage[]>([])
  const [loading, setLoading] = useState(Boolean(selected))
  const api = useCorporaApi()
  const readerRoot = useRef<HTMLElement>(null)
  const selection = useReaderSelection({ root: readerRoot, corpusId, location: selected, passages, showDetails: setLemma,
    inspectNode: (node, text, passage) => inspectTokenNode(archive, passage, text, node),
  })
  const inspectWord: InspectWord = (load, passage, element, wordNode) => {
    const request = selection.beginInspection()
    void load().then((details) => selection.finishInspection(request, details, passage, element, wordNode))
  }

  useEffect(() => {
    if (!selected) return
    // Guards against a stale response, not against unmount: clicking question A
    // then B must not let A's slower reply overwrite B's. The flag belongs to
    // this run of the effect, which is why it cannot be hoisted into a hook.
    let cancelled = false
    setLoading(true)
    api
      .fetchCorpusContent(archive, { ref: selected, limit: 20 })
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
  }, [api, archive, selected])

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
                      selection.clear()
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
      <article ref={readerRoot} data-corpus-reader="" tabIndex={-1} aria-label="Corpus reader"
        className="relative min-w-0 rounded-2xl border p-6"
        onMouseUp={selection.capture}
        onKeyUp={(event) => { if (event.key === "Shift" || event.key.startsWith("Arrow")) selection.capture() }}>
        {selection.popover}
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
          <ol className="flex select-text flex-col gap-6 [&_*]:select-text">
            {passages.map((passage, index) =>
              passage.tokens?.length ? (
                <TokenPassage
                  archive={archive}
                  index={index}
                  key={`${passage.ref}-${passage.node ?? index}`}
                  onInspect={inspectWord}
                  passage={passage}
                />
              ) : (
                <SplitPassage
                  archive={archive}
                  index={index}
                  key={`${passage.ref}-${passage.node ?? index}`}
                  onInspect={inspectWord}
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
  corpusId,
  sectionTitle,
  archive,
  onViewOccurrences,
}: {
  corpusId: string
  sectionTitle: string
  archive?: CorpusArchive | null
  onViewOccurrences?: () => void
}) {
  if (archive?.index.sections?.items.length) {
    return (
      <LiveReader
        corpusId={corpusId}
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

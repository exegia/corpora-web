import type {
  ActivityEvent,
  Lemma,
  NodeTypeStat,
  ReaderDocument,
  StructureNode,
  VersionEntry,
} from "./types"
import type { CorpusDocument } from "@/lib/corpus"
import { formatSize } from "../list/utils"
import { formatDateTime } from "./utils"

/**
 * Design-time corpus explore data. The Sketch mockup is low-fi: these numbers
 * and passages stand in until GET /storage/{file}/index and /content are
 * wired through the conversion service. Live `document.toc` / `commits` win
 * when the loader has them.
 */
export const DEMO_NODE_TYPES: NodeTypeStat[] = [
  { type: "word", count: 1_135_799, avgSlots: 1, pct: 65.8, slotType: true },
  { type: "phrase", count: 389_120, avgSlots: 2.9, pct: 22.5 },
  { type: "clause", count: 132_455, avgSlots: 8.6, pct: 7.7 },
  { type: "sentence", count: 48_210, avgSlots: 23.6, pct: 2.8 },
  { type: "paragraph", count: 21_930, avgSlots: 51.8, pct: 1.3 },
  { type: "chapter", count: 611, avgSlots: 1_859, pct: 0.04 },
]

export const STRUCTURE_TYPES = [
  "corpus",
  "book",
  "quaestio",
  "articulus",
  "sentence",
  "clause",
  "phrase",
  "word",
] as const

export const STRUCTURE_PAGE = 8
export const STRUCTURE_SLOW_AFTER = 20

const DEMO_BOOKS = [
  { title: "Prima Pars", children: 119 },
  { title: "Prima Secundae", children: 114 },
  { title: "Secunda Secundae", children: 189 },
  { title: "Tertia Pars", children: 90 },
  { title: "Supplementum", children: 99 },
] as const

/** Direct children of the next type under a given parent type. */
const NEXT_CHILD_COUNT: Record<string, number> = {
  quaestio: 4,
  articulus: 3,
  sentence: 2,
  clause: 3,
  phrase: 2,
  word: 0,
}

function bookChildCount(title: string): number {
  const key = title.trim().toLowerCase()
  const known = DEMO_BOOKS.find((book) => book.title.toLowerCase() === key)
  if (known) return known.children
  if (key.startsWith("supplement")) return 99
  return 24
}

function nextType(type: string): string | null {
  const index = STRUCTURE_TYPES.indexOf(type as (typeof STRUCTURE_TYPES)[number])
  if (index < 0 || index >= STRUCTURE_TYPES.length - 1) return null
  return STRUCTURE_TYPES[index + 1] ?? null
}

function childLabel(type: string, index: number, parent: StructureNode): string {
  if (type === "quaestio") {
    const named = /prima pars/i.test(parent.label)
      ? PRIMA_PARS_QUESTIONS[index]?.title
      : undefined
    return named ?? `Q.${index + 1}`
  }
  if (type === "articulus") return `Articulus ${index + 1}`
  if (type === "sentence") return `Sentence ${index + 1}`
  if (type === "clause") return `Clause ${index + 1}`
  if (type === "phrase") return `Phrase ${index + 1}`
  if (type === "word") return `word ${index + 1}`
  return `${type} ${index + 1}`
}

function toBookNode(
  title: string,
  index: number,
  children: number,
): StructureNode {
  return {
    id: `book-${index}`,
    type: "book",
    label: title,
    childCount: children,
  }
}

/** Root of the Structure tab: the corpus, with book children from toc when present. */
export function structureRoot(document: CorpusDocument): StructureNode {
  const books = document.toc?.length
    ? document.toc.map((section, index) =>
        toBookNode(section.title, index, bookChildCount(section.title)),
      )
    : DEMO_BOOKS.map((book, index) =>
        toBookNode(book.title, index, book.children),
      )
  return {
    id: "corpus",
    type: "corpus",
    label: document.name,
    childCount: books.length,
    children: books,
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/**
 * Page of direct children for a structure node. Large levels delay so the
 * tree can show a skeleton before the rows land.
 */
export async function loadStructureChildren(
  node: StructureNode,
): Promise<StructureNode[]> {
  if (node.children) return node.children
  const type = nextType(node.type)
  if (!type || node.childCount === 0) return []
  if (node.childCount >= STRUCTURE_SLOW_AFTER) {
    await wait(280)
  }
  const page = Math.min(STRUCTURE_PAGE, node.childCount)
  const grandchildCount = NEXT_CHILD_COUNT[type] ?? 0
  return Array.from({ length: page }, (_, index) => ({
    id: `${node.id}/${type}-${index}`,
    type,
    label: childLabel(type, index, node),
    childCount: grandchildCount,
    slotType: type === "word",
  }))
}

export const DOCTRINA: Lemma = {
  form: "doctrina",
  lemma: "doctrina",
  gloss: "teaching, instruction",
  pos: "Noun",
  posCode: "NOUN",
  case: "Nominative",
  caseCode: "NOM",
  gender: "Feminine",
  genderCode: "F",
  number: "Singular",
  numberCode: "SG",
  node: 84_213,
  occurrences: 1_284,
  occurrencesInSection: 212,
  context: ["Prima Pars", "Quaestio 1", "Articulus 1", "Sentence 2 · Clause 1"],
}

const PRIMA_PARS_QUESTIONS = [
  { id: "prooemium", title: "Prooemium" },
  { id: "q1", title: "Q.1 · Sacred doctrine" },
  { id: "q2", title: "Q.2 · The existence of God" },
  { id: "q3", title: "Q.3 · The simplicity of God" },
  { id: "q4", title: "Q.4 · The perfection of God" },
  { id: "q5", title: "Q.5 · Goodness in general" },
  { id: "q6", title: "Q.6 · The goodness of God" },
  { id: "q7", title: "Q.7 · The infinity of God" },
  { id: "q8", title: "Q.8 · God in things" },
  { id: "q9", title: "Q.9 · The immutability of God" },
  { id: "q10", title: "Q.10 · The eternity of God" },
]

const Q1_PASSAGES = [
  {
    n: 1,
    text: "Ad primum sic proceditur. Videtur quod non sit necessarium, praeter philosophicas disciplinas, aliam doctrinam haberi. Ad ea enim quae supra rationem sunt, homo non debet conari, secundum illud Eccli. III, altiora te ne quaesieris.",
  },
  {
    n: 2,
    text: "Sed ea quae rationi subduntur, sufficienter traduntur in philosophicis disciplinis. Superfluum igitur videtur, praeter philosophicas disciplinas, aliam doctrinam haberi.",
  },
  {
    n: 3,
    text: "Praeterea, doctrina non potest esse nisi de ente, nihil enim scitur nisi verum, quod cum ente convertitur. Sed de omnibus entibus tractatur in philosophicis disciplinis, et etiam de Deo.",
  },
]

export const PRIMA_PARS_READER: ReaderDocument = {
  questions: PRIMA_PARS_QUESTIONS,
  defaultQuestionId: "q1",
  articles: {
    prooemium: {
      heading: "Prooemium",
      subtitle: "Quia Catholicae veritatis doctor non solum provectos debet instruere",
      passages: [
        {
          n: 1,
          text: "Quia Catholicae veritatis doctor non solum provectos debet instruere, sed ad eum pertinet etiam incipientes erudire, secundum illud apostoli I ad Corinth. III, tanquam parvulis in Christo, lac vobis potum dedi, non escam; propositum nostrae intentionis in hoc opere est, ea quae ad Christianam religionem pertinent, eo modo tradere, secundum quod congruit ad eruditionem incipientium.",
        },
      ],
    },
    q1: {
      heading: "Quaestio 1 — De sacra doctrina, qualis sit",
      subtitle:
        "Articulus 1 · Utrum sit necessarium praeter philosophicas disciplinas aliam doctrinam haberi",
      passages: Q1_PASSAGES,
    },
    q2: {
      heading: "Quaestio 2 — De Deo, an Deus sit",
      subtitle: "Articulus 1 · Utrum Deum esse sit per se notum",
      passages: [
        {
          n: 1,
          text: "Ad primum sic proceditur. Videtur quod Deum esse sit per se notum. Illa enim nobis dicuntur per se nota, quorum cognitio nobis naturaliter inest, sicut patet de primis principiis.",
        },
      ],
    },
    q3: {
      heading: "Quaestio 3 — De Dei simplicitate",
      subtitle: "Articulus 1 · Utrum Deus sit corpus",
      passages: [
        {
          n: 1,
          text: "Ad primum sic proceditur. Videtur quod Deus sit corpus. Corpus enim est quod habet trinam dimensionem. Sed sacra Scriptura attribuit Deo trinam dimensionem.",
        },
      ],
    },
    q4: {
      heading: "Quaestio 4 — De Dei perfectione",
      subtitle: "Articulus 1 · Utrum Deus sit perfectus",
      passages: [
        {
          n: 1,
          text: "Ad primum sic proceditur. Videtur quod esse perfectum non competat Deo. Secundum enim quod aliquid est perfectum, est totum.",
        },
      ],
    },
    q5: {
      heading: "Quaestio 5 — De bono in communi",
      subtitle: "Articulus 1 · Utrum bonum differat secundum rem ab ente",
      passages: [
        {
          n: 1,
          text: "Ad primum sic proceditur. Videtur quod bonum differat secundum rem ab ente. Dicit enim Boetius in libro de Hebdomadibus, quod in rebus aliud est quod sunt, et aliud quod bona sunt.",
        },
      ],
    },
    q6: {
      heading: "Quaestio 6 — De bonitate Dei",
      subtitle: "Articulus 1 · Utrum esse bonum Deo conveniat",
      passages: [
        {
          n: 1,
          text: "Ad primum sic proceditur. Videtur quod esse bonum non conveniat Deo. Bonitatis enim ratio consistit in modo, specie et ordine.",
        },
      ],
    },
    q7: {
      heading: "Quaestio 7 — De infinitate Dei",
      subtitle: "Articulus 1 · Utrum Deus sit infinitus",
      passages: [
        {
          n: 1,
          text: "Ad primum sic proceditur. Videtur quod Deus non sit infinitus. Quod enim est infinitum, est imperfectum.",
        },
      ],
    },
    q8: {
      heading: "Quaestio 8 — De existentia Dei in rebus",
      subtitle: "Articulus 1 · Utrum Deus sit in omnibus rebus",
      passages: [
        {
          n: 1,
          text: "Ad primum sic proceditur. Videtur quod Deus non sit in omnibus rebus. Quod enim est supra omnia, non est in omnibus rebus.",
        },
      ],
    },
    q9: {
      heading: "Quaestio 9 — De immutabilitate Dei",
      subtitle: "Articulus 1 · Utrum Deus sit omnino immutabilis",
      passages: [
        {
          n: 1,
          text: "Ad primum sic proceditur. Videtur quod Deus non sit omnino immutabilis. Quidquid enim movet seipsum, est aliquo modo mutabile.",
        },
      ],
    },
    q10: {
      heading: "Quaestio 10 — De Dei aeternitate",
      subtitle: "Articulus 1 · Utrum Deus sit aeternus",
      passages: [
        {
          n: 1,
          text: "Ad primum sic proceditur. Videtur quod non sit Deus aeternus. Nihil enim factum potest dici aeternum.",
        },
      ],
    },
  },
}

/** Reader payload for a named section. Prima Pars matches the mockup; others get a stub article. */
export function readerFor(sectionTitle: string): ReaderDocument {
  if (/prima pars/i.test(sectionTitle)) return PRIMA_PARS_READER
  const id = "body"
  return {
    questions: [{ id, title: sectionTitle }],
    defaultQuestionId: id,
    articles: {
      [id]: {
        heading: sectionTitle,
        subtitle: "Section text is shown here once the archive content endpoint is connected.",
        passages: [
          {
            n: 1,
            text: `No passage text is stored on this document yet. “${sectionTitle}” is listed in the table of contents captured at conversion.`,
          },
        ],
      },
    },
  }
}

export function versionsFor(document: CorpusDocument): VersionEntry[] {
  const versions: VersionEntry[] = []
  if (document.convertedAt) {
    versions.push({
      id: "converted",
      label: "v1.1",
      title: "Converted",
      at: document.convertedAt,
      current: true,
      notes: document.sourceFormat
        ? [`Source format ${document.sourceFormat}`]
        : [],
    })
  }
  versions.push({
    id: "uploaded",
    label: document.convertedAt ? "v1.0" : "v1.0",
    title: "Initial upload",
    at: document.uploadedAt,
    current: !document.convertedAt,
    notes: [
      document.filename ? document.filename : "Uploaded to the library",
      document.docsCount
        ? `${document.docsCount.toLocaleString("en-US")} documents imported`
        : null,
    ].filter((note): note is string => Boolean(note)),
  })
  return versions
}

export function activityFor(document: CorpusDocument): ActivityEvent[] {
  const events: ActivityEvent[] = []
  if (document.convertedAt) {
    events.push({
      id: "converted",
      title: "Conversion succeeded",
      detail: document.sourceFormat
        ? `${document.sourceFormat} → corpus archive`
        : "Archive ready to browse",
      at: document.convertedAt,
      accent: true,
    })
  }
  events.push({
    id: "uploaded",
    title: "Upload received",
    detail:
      [document.filename, formatSize(document.sizeBytes)]
        .filter((part) => part && part !== "—")
        .join(" · ") || "File stored in the library",
    at: document.uploadedAt,
    accent: !document.convertedAt,
  })
  events.push({
    id: "created",
    title: "Corpus created",
    detail: `Added to the library`,
    at: document.uploadedAt,
    accent: false,
  })
  return events
}

export function activityTimestamp(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const delta = now.getTime() - then
  const day = 1000 * 60 * 60 * 24
  if (delta < day) return formatDateTime(iso).replace(/.*,\s*/, "")
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

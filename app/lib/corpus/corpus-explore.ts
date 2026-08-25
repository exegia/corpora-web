import type {
  ContentResponse,
  CorpusIndex,
  CorpusNode,
  IndexItem,
  SectionEntry,
} from "@/lib/api/methods"
import type { CorpusDocument, CorpusSection } from "@/lib/corpus/corpus"
import type {
  Lemma,
  NodeTypeStat,
  StructureNode,
} from "@/components/corpus/detail/types"

/** Overview rows from a live index when the library document has no toc. */
export function sectionsFromIndex(index: CorpusIndex): CorpusSection[] {
  const items = index.sections?.items
  if (!items?.length) return []
  return items.map((item) => ({
    title: item.title,
    nodes: item.nodes ?? item.child_count ?? item.children.length,
    words: item.words ?? null,
  }))
}

export function findIndexItem(
  index: CorpusIndex,
  title: string | null,
): IndexItem | null {
  const items = index.sections?.items
  if (!items?.length) return null
  if (!title) return items[0] ?? null
  return items.find((item) => item.title === title) ?? items[0] ?? null
}

/** Collapsible tree from the index's section list. */
export function structureRootFromIndex(
  document: CorpusDocument,
  index: CorpusIndex,
): StructureNode | null {
  const sections = index.sections
  if (!sections?.items.length) return null
  const [topType, childType] = sections.levels
  return {
    id: "corpus",
    type: "corpus",
    label: document.name,
    childCount: sections.items.length,
    children: sections.items.map((item) => ({
      id: item.ref || item.title,
      type: item.otype ?? topType ?? "book",
      label: item.title,
      childCount: item.child_count ?? item.children.length,
      ref: item.ref,
      children: item.children.map((child) => ({
        id: child.ref || child.title,
        type: child.otype ?? childType ?? "section",
        label: child.title,
        childCount: child.child_count ?? null,
        ref: child.ref,
      })),
    })),
  }
}

export function structureNodeFromSection(
  item: SectionEntry,
  fallbackType: string,
): StructureNode {
  return {
    id: item.ref || item.title,
    type: item.otype ?? fallbackType,
    label: item.title,
    childCount: item.child_count ?? null,
    ref: item.ref,
  }
}

export function passagesToNodes(
  content: ContentResponse,
  parent: StructureNode,
): StructureNode[] {
  return content.passages.map((passage, index) => ({
    id: String(passage.node ?? `${parent.id}-p${index}`),
    type: parent.type === "corpus" ? "passage" : parent.type,
    label: passage.ref || passage.text.slice(0, 48) || `passage ${index + 1}`,
    childCount: 0,
    node: passage.node,
  }))
}

export function nodeTypeStatsFromIndex(index: CorpusIndex): NodeTypeStat[] {
  const types = index.node_types
  if (!types.length) return []
  const total = types.reduce((sum, row) => sum + row.count, 0) || 1
  const slot = types.reduce((best, row) =>
    row.count > best.count ? row : best,
  )
  return types.map((row) => ({
    type: row.type,
    count: row.count,
    avgSlots: row.avg_slots ?? 0,
    pct: (row.count / total) * 100,
    slotType: row.is_slot ?? row.type === slot.type,
  }))
}

function featureString(
  features: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = features[key]
    if (typeof value === "string" && value.trim()) return value
    if (typeof value === "number") return String(value)
  }
  return undefined
}

/** Map a Hub node payload onto the reader inspect panel. */
/**
 * Slot id for the `wordIndex`-th token under a passage node. Slot corpora
 * (Text-Fabric) number words consecutively from `first_slot`; a slot node
 * is itself the token.
 */
export function slotForToken(
  node: CorpusNode,
  wordIndex: number,
): number | null {
  if (node.is_slot) return node.node
  if (node.first_slot == null || node.last_slot == null) return null
  const slot = node.first_slot + wordIndex
  if (slot < node.first_slot || slot > node.last_slot) return null
  return slot
}

export function lemmaFromNode(
  node: CorpusNode,
  form: string,
): Lemma {
  const lemma =
    featureString(node.features, ["lemma", "lex", "word", "form"]) ?? form
  const pos = featureString(node.features, ["sp", "pos", "pdp", "otype"]) ?? node.otype
  const grammaticalCase = featureString(node.features, ["case", "cas"]) ?? "—"
  const gender = featureString(node.features, ["gn", "gender", "gen"]) ?? "—"
  const number = featureString(node.features, ["nu", "number", "num"]) ?? "—"
  const gloss = featureString(node.features, ["gloss", "g_word", "g_lex"]) ?? ""
  const context = node.context?.length
    ? node.context.map((crumb) => crumb.ref || crumb.otype).filter(Boolean)
    : node.section_ref
      ? node.section_ref.split(/[>,]/).map((part) => part.trim()).filter(Boolean)
      : []
  return {
    form,
    lemma,
    gloss,
    pos,
    posCode: pos.toUpperCase(),
    case: grammaticalCase,
    caseCode: grammaticalCase.toUpperCase(),
    gender,
    genderCode: gender.toUpperCase(),
    number,
    numberCode: number.toUpperCase(),
    node: node.node,
    occurrences: node.occurrences ?? 0,
    occurrencesInSection: node.occurrences_in_section ?? 0,
    context,
  }
}

import type { CorpusCommitInput, CorpusSection } from "@/lib/corpus"

export function parseCommits(raw: string): CorpusCommitInput[] {
    try {
        const parsed = JSON.parse(raw || "[]")
        if (!Array.isArray(parsed)) return []
        return parsed.filter(
            (commit): commit is CorpusCommitInput =>
                typeof commit?.sha === "string" && typeof commit?.message === "string"
        )
    } catch {
        return []
    }
}

export function parseToc(raw: string): CorpusSection[] | null {
    try {
        const parsed = JSON.parse(raw || "null")
        if (!Array.isArray(parsed)) return null
        const sections = parsed.filter((section): section is CorpusSection => typeof section?.title === "string")
        return sections.length > 0 ? sections : null
    } catch {
        return null
    }
}

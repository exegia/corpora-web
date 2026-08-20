export const SECTION_LABELS: Record<string, string> = {
    references: "References",
    library: "Library",
    project: "Projects",
    corpus: "Corpus",
    licenses: "Licenses",
    profile: "Profile",
}

/** Route data shaped like the project detail loader's result. */
export function isProjectDetailData(data: unknown): data is { project: { name: string } | null } {
    return (
        typeof data === "object" &&
        data !== null &&
        "project" in data &&
        typeof (data as { project: unknown }).project === "object"
    )
}

/** Route data shaped like the corpus detail loader's result. */
export function isCorpusDetailData(data: unknown): data is { document: { name: string } | null } {
    return (
        typeof data === "object" &&
        data !== null &&
        "document" in data &&
        typeof (data as { document: unknown }).document === "object"
    )
}

/** Route data shaped like the licence detail loader's result. */
export function isLicenceDetailData(data: unknown): data is { licence: { title: string } | null } {
    return (
        typeof data === "object" &&
        data !== null &&
        "licence" in data &&
        typeof (data as { licence: unknown }).licence === "object"
    )
}

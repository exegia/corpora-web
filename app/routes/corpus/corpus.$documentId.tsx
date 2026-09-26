import {  FileArchive, ListTree } from "lucide-react"
import { Suspense } from "react"
import { Await,  Outlet, redirect, useLoaderData, useLocation, useSearchParams } from "react-router"
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router"
import { CorpusDetail } from "@/components/corpus/detail"
import type { ExploreTab, TTabItem } from "@/components/corpus/detail/types"
import { parseExploreTab, sectionByTitle } from "@/components/corpus/detail/utils"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import CorporaApi, { type CorpusArchive, CorporaApiError } from "@/lib/api"

import Corpus from "@/lib/corpus"
import type { CorpusDocument, CorpusSection } from "@/lib/corpus"
import Project from "@/lib/projects"

export type CorpusExplorerContext = {
    document: CorpusDocument
    archive: CorpusArchive | null
}

const EXPLORE_TABS: TTabItem[] = [
    { label: "Overview", value: "overview", id: "overview" },
    { label: "Documents", value: "documents", id: "documents" },
    { label: "Structure", value: "structure", id: "structure" },
    { label: "Activity", value: "activity", id: "activity" },
]

/** Map a leftover `?tab=` value onto the nested explorer path. */
function legacyExplorePath(request: Request, documentId: string): string | null {
    const url = new URL(request.url)
    const tabParam = url.searchParams.get("tab")
    if (tabParam === null) return null
    const tab = parseExploreTab(tabParam)
    url.searchParams.delete("tab")
    if (tab !== "documents") url.searchParams.delete("section")
    const pathname = tab === "overview" ? `/corpus/${documentId}` : `/corpus/${documentId}/${tab}`
    return `${pathname}${url.search}`
}

function exploreTabFromPath(pathname: string, documentId: string): ExploreTab {
    const prefix = `/corpus/${documentId}`
    if (pathname === prefix || pathname === `${prefix}/`) return "overview"
    if (!pathname.startsWith(`${prefix}/`)) return "overview"
    const segment = pathname.slice(prefix.length + 1).split("/")[0] ?? ""
    return parseExploreTab(segment || null)
}

export function explorerSections(document: CorpusDocument, archive: CorpusArchive | null): CorpusSection[] {
    return document.toc?.length ? document.toc : archive ? Corpus.Explore.sectionsFromIndex(archive.index) : []
}

export async function clientLoader({ params, request }: LoaderFunctionArgs) {
    const legacy = legacyExplorePath(request, params.documentId ?? "")
    if (legacy) throw redirect(legacy)
    // Awaited: the breadcrumb reads `document` off loaderData synchronously
    // (components/breadcrumb), and it is one indexed row.
    const document = await Corpus.Documents.getCorpusDocument(params.documentId ?? "")
    // Job (or Hub-import) index is the slow follow-up; defer so the header
    // paints immediately. The breadcrumb only needs `document`.
    const archive = document ? CorporaApi.loadCorpusArchive(document) : Promise.resolve(null)
    return { document, archive }
}

export async function clientAction({ request }: ActionFunctionArgs) {
    const form = await request.formData()
    const intent = String(form.get("intent") ?? "")
    try {
        switch (intent) {
            case "delete-document":
                await Corpus.Documents.deleteCorpusDocument(String(form.get("documentId") ?? ""))
                return redirect("/corpus")
            case "restore-version": {
                const jobId = String(form.get("jobId") ?? "")
                const versionId = String(form.get("versionId") ?? "")
                if (!jobId || !versionId) {
                    return { ok: false, error: "Missing version to restore." }
                }
                await CorporaApi.restoreCorpusVersion({ kind: "job", key: jobId }, versionId)
                return { ok: true }
            }
            default:
                return { ok: false, error: "Unknown action." }
        }
    } catch (error) {
        if (error instanceof Project.Errors.DataError) {
            return { ok: false, error: error.message }
        }
        if (error instanceof CorporaApiError) {
            return { ok: false, error: error.message }
        }
        return { ok: false, error: "Something went wrong. Your change was not saved." }
    }
}

function NotFound() {
    return (
        <Empty className="py-10 md:py-14">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <FileArchive />
                </EmptyMedia>
                <EmptyTitle>This corpus no longer exists</EmptyTitle>
                <EmptyDescription>
                    It may have been deleted. The library lists everything that is still available.
                </EmptyDescription>
            </EmptyHeader>
        </Empty>
    )
}



function ArchiveFallback() {

    return (
        <div
            aria-busy="true"
            aria-label="Loading corpus archive"
            className="grid gap-6 lg:grid-cols-[18rem_1fr]"
            role="status">
            <div className="flex flex-col gap-3 rounded-2xl border p-4">
                <Skeleton className="h-4 w-20" />
                {Array.from({ length: 6 }, (_, i) => (
                    <Skeleton className="h-8 w-full" key={i} />
                ))}
            </div>
            <Skeleton className="h-48 w-full" />
        </div>
    )
}

export function EmptySections() {
    return (
        <Empty className="py-10">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <ListTree />
                </EmptyMedia>
                <EmptyTitle>No sections yet</EmptyTitle>
                <EmptyDescription>No section data was captured for this corpus.</EmptyDescription>
            </EmptyHeader>
        </Empty>
    )
}

export default function CorpusDetailRoute() {
    const { document, archive } = useLoaderData<typeof clientLoader>()
    const { pathname } = useLocation()
    const [params] = useSearchParams()
    if (!document) return <NotFound />
    const tab = exploreTabFromPath(pathname, document.id)
    const sectionTitle = params.get("section")
    const tocSection = sectionByTitle(document.toc, sectionTitle)
    const reading = tab === "documents" && (tocSection != null || Boolean(sectionTitle))

    return (
        <>
            <CorpusDetail.Header document={document} tabs={EXPLORE_TABS} hideMeta={Boolean(reading)} />
            <Suspense fallback={<ArchiveFallback />}>
                <Await resolve={archive}>
                    {resolved => <Outlet context={{ archive: resolved, document } satisfies CorpusExplorerContext} />}
                </Await>
            </Suspense>
        </>
    )
}
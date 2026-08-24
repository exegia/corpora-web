import { Suspense } from "react"
import { Await, useLoaderData, useOutletContext, type ActionFunctionArgs } from "react-router"
import { Convert } from "@/components/corpus/convert"
import type { ConversionController } from "@/components/corpus/convert/use-conversion"
import { List } from "@/components/corpus/list"
import { createCorpusDocument, deleteCorpusDocument, listCorpusDocuments, type CorpusType } from "@/lib/corpus"
import { DataError, type CorpusSource } from "@/lib/projects"
import { parseCommits, parseToc } from "./utils"

export async function clientLoader() {
    // Deliberately not awaited (see routes/project.tsx): navigation completes
    // immediately, the upload controls stay interactive, and the list suspends
    // on this promise, showing the skeleton meanwhile.
    const documents = listCorpusDocuments()
    return { documents }
}

export async function clientAction({ request }: ActionFunctionArgs) {
    const form = await request.formData()
    const intent = String(form.get("intent") ?? "")
    try {
        switch (intent) {
            case "create-document":
                await createCorpusDocument({
                    name: String(form.get("name") ?? ""),
                    source: String(form.get("source") ?? "upload") as CorpusSource,
                    path: String(form.get("path") ?? ""),
                    filename: String(form.get("filename") ?? "") || null,
                    commits: parseCommits(String(form.get("commits") ?? "[]")),
                })
                return { ok: true, intent }
            case "convert-document": {
                // The terminal write of a successful conversion (use-conversion):
                // the only place conversion metadata enters the database.
                const number = (name: string) => {
                    const value = Number(form.get(name))
                    return Number.isFinite(value) && value > 0 ? value : null
                }
                const created = await createCorpusDocument({
                    name: String(form.get("name") ?? ""),
                    source: "upload",
                    path: String(form.get("path") ?? ""),
                    filename: String(form.get("filename") ?? "") || null,
                    jobId: String(form.get("jobId") ?? "").trim() || null,
                    corpusType: (String(form.get("corpusType") ?? "") as CorpusType) || null,
                    sourceFormat: String(form.get("sourceFormat") ?? "") || null,
                    language: String(form.get("language") ?? "") || null,
                    description: String(form.get("description") ?? "") || null,
                    toc: parseToc(String(form.get("toc") ?? "")),
                    sizeBytes: number("sizeBytes"),
                    nodes: number("nodes"),
                    status: "converted",
                    convertedAt: String(form.get("convertedAt") ?? "") || null,
                    commits: parseCommits(String(form.get("commits") ?? "[]")),
                })
                return { ok: true, intent, documentId: created.id }
            }
            case "delete-document":
                await deleteCorpusDocument(String(form.get("documentId") ?? ""))
                return { ok: true, intent }
            default:
                return { ok: false, error: "Unknown action." }
        }
    } catch (error) {
        if (error instanceof DataError) {
            return { ok: false, error: error.message }
        }
        return { ok: false, error: "Something went wrong. Your change was not saved." }
    }
}

/**
 * The corpus library (003): upload .corpus documents or convert source files
 * (text-fabric XML, TEI) into them. Conversion state lives on the app layout
 * (so the shell's right panel survives navigation) and reaches this route
 * through the outlet context; the pill and the Convert/Upload actions render
 * here, on the page's own header row.
 */
export default function Corpus() {
    const { documents } = useLoaderData<typeof clientLoader>()
    const conversion = useOutletContext<ConversionController>()

    return (
        <section className="flex flex-col gap-6">
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex w-full flex-row items-center justify-between">
                    <h1 className="font-heading text-2xl font-bold">Corpus</h1>
                    <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                        <Convert.Actions conversion={conversion} />
                    </div>
                </div>
                <p className="text-muted-foreground">
                    The documents your projects publish — upload a .corpus file or convert a source document. Projects
                    import their corpus from this library.
                </p>
            </header>

            {conversion.entry && (
                <Convert.StatusPill
                    documentId={conversion.documentId}
                    entry={conversion.entry}
                    onDismiss={conversion.dismiss}
                    onOpen={conversion.openPanel}
                />
            )}

            <Suspense fallback={<List.Skeleton />}>
                <Await resolve={documents}>{resolved => <List.Documents documents={resolved} />}</Await>
            </Suspense>
        </section>
    )
}

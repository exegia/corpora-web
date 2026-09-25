import { afterEach, describe, expect, it, vi } from "vitest"
import { uploadCorpusFile } from "@/lib/corpus/corpus"

const { upload, from } = vi.hoisted(() => {
    const upload = vi.fn().mockResolvedValue({ error: null })
    return { upload, from: vi.fn().mockReturnValue({ upload }) }
})

vi.mock("@/lib/supabase", () => ({
    getSupabase: () => ({ storage: { from } }),
}))

afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
})

describe("uploadCorpusFile", () => {
    it("stores converted archives when randomUUID is unavailable on HTTP", async () => {
        vi.stubGlobal("crypto", {
            getRandomValues: crypto.getRandomValues.bind(crypto),
        })
        const file = new File(["corpus-bytes"], "aramaic-grammar.corpus", { type: "application/zip" })

        const path = await uploadCorpusFile(file)

        expect(path).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/aramaic-grammar\.corpus$/)
        expect(from).toHaveBeenCalledWith("project-corpora")
        expect(upload).toHaveBeenCalledWith(path, file, { upsert: true })
        expect(await uploadCorpusFile(file)).not.toBe(path)
    })
})

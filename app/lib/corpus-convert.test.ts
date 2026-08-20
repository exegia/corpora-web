import { describe, expect, it } from "vitest"
import {
  createConversionEntry,
  currentStep,
  deriveProgress,
  deriveSteps,
  detectSourceFormat,
  fabricateSections,
  fabricateStats,
  formatBytes,
  runConversion,
  shouldFail,
} from "@/lib/corpus-convert"
import type { ConversionEntry } from "@/lib/corpus-convert"

// Instant clock: resolves every delay immediately so a full run finishes in
// one macrotask-free await chain (fake timers deadlock async loops).
const instantly = { delay: () => Promise.resolve() }

const file = {
  name: "summa-theologia-1200-ENG.xml",
  size: 4_400_000,
  type: "text/xml",
  lastModified: 1750000000000,
}

async function runToEnd(name = file.name): Promise<{
  final: ConversionEntry
  snapshots: ConversionEntry[]
}> {
  const snapshots: ConversionEntry[] = []
  const final = await runConversion(
    createConversionEntry({ ...file, name }),
    (entry) => snapshots.push(entry),
    instantly,
  )
  return { final, snapshots }
}

describe("corpus-convert pipeline", () => {
  it("walks the corpora-py status sequence to ready", async () => {
    const { final, snapshots } = await runToEnd()
    const statuses = [...new Set(snapshots.map((s) => s.status))]
    expect(statuses).toEqual([
      "uploading",
      "queued",
      "converting",
      "validating",
      "ready",
    ])
    expect(final.status).toBe("ready")
    expect(final.corpusName).toBe("summa-theologia-1200-ENG.corpus")
    expect(final.validation?.status).toBe("valid")
    expect(final.finishedAt).not.toBeNull()
  })

  it("derives all four steps completed once ready", async () => {
    const { final } = await runToEnd()
    const steps = deriveSteps(final)
    expect(steps.map((s) => s.state)).toEqual([
      "completed",
      "completed",
      "completed",
      "completed",
    ])
    expect(deriveProgress(final)).toBe(1)
    // Every step accumulated its own log lines.
    for (const step of steps) expect(step.logs.length).toBeGreaterThan(0)
  })

  it("marks the convert step failed for a *fail* filename, later steps pending", async () => {
    const { final } = await runToEnd("summa-fail.xml")
    expect(shouldFail("summa-fail.xml")).toBe(true)
    expect(final.status).toBe("error")
    expect(final.error).toMatch(/^IndexError — job /)

    const steps = deriveSteps(final)
    expect(steps.map((s) => s.state)).toEqual([
      "completed",
      "completed",
      "failed",
      "pending",
    ])
    expect(currentStep(final)).toEqual({ id: "convert", index: 3 })
    expect(
      steps[2].logs.some((log) => log.tone === "error"),
    ).toBe(true)
  })

  it("stops emitting when aborted", async () => {
    const controller = new AbortController()
    const snapshots: ConversionEntry[] = []
    const final = await runConversion(
      createConversionEntry(file),
      (entry) => {
        snapshots.push(entry)
        if (entry.status === "queued") controller.abort()
      },
      { ...instantly, signal: controller.signal },
    )
    expect(final.status).toBe("queued")
    expect(snapshots.at(-1)?.status).toBe("queued")
  })

  it("reports the active step while running", async () => {
    const seen: string[] = []
    await runConversion(
      createConversionEntry(file),
      (entry) => seen.push(`${entry.status}:${currentStep(entry).index}`),
      instantly,
    )
    expect(seen).toContain("uploading:1")
    expect(seen).toContain("queued:2")
    expect(seen).toContain("converting:3")
    expect(seen).toContain("validating:4")
  })

  it("fabricates stable stats and sections from the same seed", () => {
    expect(fabricateStats(file.name)).toEqual(fabricateStats(file.name))
    expect(fabricateSections("d1")).toEqual(fabricateSections("d1"))
    expect(fabricateStats("a.xml")).not.toEqual(fabricateStats("b.xml"))
    const stats = fabricateStats(file.name)
    expect(stats.nodes).toBeGreaterThan(0)
    expect(stats.words).toBeGreaterThan(stats.nodes)
  })

  it("detects the source format from the extension", () => {
    expect(detectSourceFormat("book.xml")).toBe("text-fabric")
    expect(detectSourceFormat("book.tei")).toBe("tei")
    expect(detectSourceFormat("book.pdf")).toBeNull()
  })

  it("formats byte sizes for the log lines", () => {
    expect(formatBytes(512)).toBe("512 B")
    expect(formatBytes(4_400_000)).toBe("4.2 MB")
  })
})

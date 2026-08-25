import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  CorporaApiError,
  createConversion,
  downloadConversion,
  getConversion,
  validateConversion,
} from "@/lib/api/methods"
import type { JobStatusMessage } from "@/lib/api/methods"
import {
  createConversionEntry,
  currentStep,
  deriveProgress,
  deriveSteps,
  formatBytes,
  libraryTitle,
  runConversion,
} from "@/lib/corpus/convert"
import type { ConversionEntry } from "@/lib/corpus/convert"

// The transport is mocked at the corpora-api seam; the derivations stay
// real, so these tests exercise exactly what the drawer will render.
vi.mock("@/lib/corpora-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/methods")>()),
  createConversion: vi.fn(),
  getConversion: vi.fn(),
  downloadConversion: vi.fn(),
  validateConversion: vi.fn(),
}))

const instantly = { delay: () => Promise.resolve() }

const file = new File(["<tei/>"], "summa-theologia.xml", { type: "text/xml" })

function job(
  status: JobStatusMessage["status"],
  logs: string[] = [],
  error: string | null = null,
): JobStatusMessage {
  return {
    id: "j1",
    source_format: "tei",
    name: "summa-theologia",
    status,
    created_at: 1_755_600_000,
    started_at: status === "queued" ? null : 1_755_600_001,
    finished_at: status === "succeeded" || status === "failed" ? 1_755_600_100 : null,
    error,
    logs,
    last_log: logs.at(-1) ?? null,
    display_name: status === "queued" ? null : "Summa Theologiae",
    result_filename: "summa-theologiae.corpus",
    download_ready: status === "succeeded",
  }
}

async function runToEnd(input: File = file): Promise<{
  final: ConversionEntry
  snapshots: ConversionEntry[]
}> {
  const snapshots: ConversionEntry[] = []
  const final = await runConversion(
    input,
    createConversionEntry(input),
    (entry) => snapshots.push(entry),
    instantly,
  )
  return { final, snapshots }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(createConversion).mockResolvedValue({ jobId: "j1" })
  vi.mocked(validateConversion).mockResolvedValue({
    status: "valid",
    stats: { max_slot: 30_102 },
  })
  vi.mocked(downloadConversion).mockResolvedValue(new Blob(["corpus-bytes"]))
})

describe("corpus-convert transport", () => {
  it("walks a real job to ready: poll, validate, download", async () => {
    vi.mocked(getConversion)
      .mockResolvedValueOnce(job("queued"))
      .mockResolvedValueOnce(job("running", ["Parsing tei source and building Text-Fabric dataset..."]))
      .mockResolvedValueOnce(
        job("succeeded", [
          "Parsing tei source and building Text-Fabric dataset...",
          "Conversion complete.",
        ]),
      )

    const { final, snapshots } = await runToEnd()

    expect(final.status).toBe("ready")
    expect(final.jobId).toBe("j1")
    expect(final.displayName).toBe("Summa Theologiae")
    expect(final.resultFilename).toBe("summa-theologiae.corpus")
    expect(final.corpusBlob).not.toBeNull()
    expect(final.corpusName).toBe("summa-theologiae.corpus")
    expect(final.validation).toEqual({
      status: "valid",
      stats: { max_slot: 30_102 },
    })
    const statuses = [...new Set(snapshots.map((s) => s.status))]
    expect(statuses).toEqual([
      "uploading",
      "queued",
      "converting",
      "validating",
      "ready",
    ])
    // Server log lines land on the step implied by the server status.
    const convertLogs = final.logs.filter((log) => log.step === "convert")
    expect(convertLogs.map((log) => log.text)).toContain(
      "> Parsing tei source and building Text-Fabric dataset...",
    )
    expect(deriveSteps(final).map((s) => s.state)).toEqual([
      "completed",
      "completed",
      "completed",
      "completed",
    ])
    expect(deriveProgress(final)).toBe(1)
    expect(createConversion).toHaveBeenCalledWith({
      file,
      sourceFormat: "tei",
      name: "summa-theologia",
    })
  })

  it("marks the convert step failed with the server's error", async () => {
    vi.mocked(getConversion)
      .mockResolvedValueOnce(job("running"))
      .mockResolvedValueOnce(
        job("failed", [], "Conversion failed: KeyError (job id j1)"),
      )

    const { final } = await runToEnd()
    expect(final.status).toBe("error")
    expect(final.error).toBe("Conversion failed: KeyError (job id j1)")
    expect(deriveSteps(final).map((s) => s.state)).toEqual([
      "completed",
      "completed",
      "failed",
      "pending",
    ])
    expect(currentStep(final)).toEqual({ id: "convert", index: 3 })
    expect(downloadConversion).not.toHaveBeenCalled()
  })

  it("prefers the job display_name over a de-slugged filename stem", () => {
    expect(
      libraryTitle({
        displayName: "Summa Theologiae",
        manifestName: "summa-theologia-1200-ENG",
        filenameStem: "summa-theologia-1200-ENG",
      }),
    ).toBe("Summa Theologiae")
    expect(
      libraryTitle({
        displayName: null,
        manifestName: null,
        filenameStem: "summa-theologia-1200-ENG",
      }),
    ).toBe("summa theologia 1200 ENG")
  })

  it("rejects unsupported files before anything is uploaded", async () => {
    const png = new File(["png"], "image.png", { type: "image/png" })
    const { final } = await runToEnd(png)
    expect(final.status).toBe("error")
    expect(deriveSteps(final)[0].state).toBe("failed")
    expect(createConversion).not.toHaveBeenCalled()
  })

  it("fails the receive step when the service refuses the upload", async () => {
    vi.mocked(createConversion).mockRejectedValueOnce(
      new CorporaApiError("queue-full", "The conversion queue is full.", 429),
    )
    const { final } = await runToEnd()
    expect(final.status).toBe("error")
    expect(final.error).toMatch(/queue is full/)
    expect(currentStep(final).id).toBe("receive")
  })

  it("tolerates early instance fan-out, then reaches the job", async () => {
    // The first polls can hit a Vercel instance that never saw the job.
    vi.mocked(getConversion)
      .mockRejectedValueOnce(new CorporaApiError("not-found", "nope", 404))
      .mockRejectedValueOnce(new CorporaApiError("unreachable", "offline"))
      .mockResolvedValueOnce(job("succeeded"))
    const { final } = await runToEnd()
    expect(final.status).toBe("ready")
  })

  it("gives up after repeated first-poll failures", async () => {
    vi.mocked(getConversion).mockRejectedValue(
      new CorporaApiError("not-found", "nope", 404),
    )
    const { final } = await runToEnd()
    expect(final.status).toBe("error")
    expect(getConversion).toHaveBeenCalledTimes(4) // initial + 3 retries
    expect(final.error).toMatch(/no longer knows this job/)
  })

  it("treats a 404 after prior contact as the service forgetting the job", async () => {
    vi.mocked(getConversion)
      .mockResolvedValueOnce(job("running"))
      .mockRejectedValueOnce(new CorporaApiError("not-found", "gone", 404))
    const { final } = await runToEnd()
    expect(final.status).toBe("error")
    expect(final.error).toBe(
      "The service no longer knows this job — its instance was recycled. Retry to start over.",
    )
    expect(currentStep(final).id).toBe("convert")
  })

  it("renders distinct copy per failure kind", async () => {
    for (const [kind, fragment] of [
      ["unreachable", /could not be reached/],
      ["queue-full", /queue is full/],
      ["too-large", /500 MiB/],
      ["unauthorized", /sign in/],
    ] as const) {
      vi.mocked(createConversion).mockRejectedValueOnce(
        new CorporaApiError(kind, "raw server detail"),
      )
      const { final } = await runToEnd()
      expect(final.status).toBe("error")
      expect(final.error).toMatch(fragment)
    }
  })

  it("stops polling when aborted", async () => {
    const controller = new AbortController()
    vi.mocked(getConversion).mockImplementation(async () => {
      controller.abort()
      return job("queued")
    })
    const final = await runConversion(
      file,
      createConversionEntry(file),
      () => {},
      { ...instantly, signal: controller.signal },
    )
    expect(final.status).toBe("queued")
    expect(getConversion).toHaveBeenCalledTimes(1)
    expect(downloadConversion).not.toHaveBeenCalled()
  })

  it("annotates an invalid corpus but still downloads it", async () => {
    vi.mocked(getConversion).mockResolvedValueOnce(job("succeeded"))
    vi.mocked(validateConversion).mockResolvedValueOnce({
      status: "invalid",
      reasons: ["missing otype feature"],
    })
    const { final } = await runToEnd()
    expect(final.status).toBe("ready")
    expect(final.validation?.status).toBe("invalid")
    expect(
      final.logs.some((log) => log.text.includes("missing otype feature")),
    ).toBe(true)
    expect(downloadConversion).toHaveBeenCalled()
  })

  it("fails the index step when the download fails", async () => {
    vi.mocked(getConversion).mockResolvedValueOnce(job("succeeded"))
    vi.mocked(downloadConversion).mockRejectedValueOnce(
      new CorporaApiError("not-ready", "Job is running, not ready", 409),
    )
    const { final } = await runToEnd()
    expect(final.status).toBe("error")
    expect(currentStep(final).id).toBe("index")
    expect(final.corpusBlob).toBeNull()
  })

  it("formats byte sizes for the log lines", () => {
    expect(formatBytes(512)).toBe("512 B")
    expect(formatBytes(4_400_000)).toBe("4.2 MB")
  })
})

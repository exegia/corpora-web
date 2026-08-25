import { useEffect, useRef, useState } from "react"
import { useFetcher } from "react-router"
import { toastManager } from "@/components/ui/toast"
import { uploadCorpusFile } from "@/lib/corpus/corpus"
import { extractCorpusHistory } from "@/lib/corpus/history"
import Project from "@/lib/projects"

export interface CorpusUploadController {
  inputRef: React.RefObject<HTMLInputElement | null>
  uploading: boolean
  busy: boolean
  pick: () => void
  handleFile: (file: File) => Promise<void>
}

/**
 * Direct .corpus uploads from the layout header: store the archive, then
 * create the registry row through the /corpus route's `create-document`
 * action. Errors surface as toasts — the header has no page to render an
 * inline alert into.
 */
export function useCorpusUpload(): CorpusUploadController {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const actionError = fetcher.data?.ok === false ? fetcher.data.error : null
  useEffect(() => {
    if (actionError) {
      toastManager.add({ title: "Upload failed", description: actionError })
    }
  }, [actionError])

  async function handleFile(file: File) {
    setUploading(true)
    try {
      // History first: an unreadable archive fails before anything is stored.
      const history = await extractCorpusHistory(file)
      const path = await uploadCorpusFile(file)
      fetcher.submit(
        {
          intent: "create-document",
          name: file.name.replace(/\.corpus$/, ""),
          source: "upload",
          path,
          filename: file.name,
          commits: JSON.stringify(history ?? []),
        },
        { method: "post", action: "/corpus" },
      )
    } catch (error) {
      toastManager.add({
        title: "Upload failed",
        description:
          error instanceof Project.Errors.DataError
            ? error.message
            : "Something went wrong while uploading the corpus.",
      })
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return {
    inputRef,
    uploading,
    busy: uploading || fetcher.state !== "idle",
    pick: () => inputRef.current?.click(),
    handleFile,
  }
}

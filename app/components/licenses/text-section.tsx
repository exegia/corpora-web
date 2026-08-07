import { useEffect, useRef, useState } from "react"
import { useRemarkSync } from "react-remark"
import { useFetcher } from "react-router"
import { Button } from "@/components/ui/button"
import { Card, CardFrame, CardFrameAction, CardFrameHeader, CardFrameTitle, CardPanel } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import type { LicenceDetail } from "@/lib/licenses"
import { useReadySound } from "@/lib/sounds"

/**
 * The stored licence text rendered as markdown with react-remark: a read-only
 * view for everyone, with a simple raw-markdown Edit → Save flow for the
 * superadmin persisting back to the db. react-remark only renders — the edit
 * surface is a plain textarea over the markdown source.
 */
export default function LicenceTextSection({
  licence,
  text,
  superadmin,
}: {
  licence: LicenceDetail
  text: string | null
  superadmin: boolean
}) {
  useReadySound()
  const fetcher = useFetcher<{ ok: boolean; error?: string }>()
  const submittedRef = useRef(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(text ?? "")
  const busy = fetcher.state !== "idle"
  // Synchronous render — the stored text carries no async remark plugins.
  const rendered = useRemarkSync(text ?? "")

  // Leave edit mode only once the save lands; a failed save keeps the
  // editor open with its error visible.
  useEffect(() => {
    if (submittedRef.current && fetcher.state === "idle" && fetcher.data?.ok) {
      submittedRef.current = false
      setEditing(false)
    }
  }, [fetcher.state, fetcher.data])

  // Re-seed the draft from the (revalidated) stored text whenever we are not
  // actively editing — so a saved edit and Cancel both reset cleanly.
  useEffect(() => {
    if (!editing) setDraft(text ?? "")
  }, [text, editing])

  const hasText = text !== null

  return (
    <CardFrame>
      <CardFrameHeader>
        <CardFrameTitle render={<h2 />}>License</CardFrameTitle>
        {superadmin && (
          <CardFrameAction>
            {editing ? (
              <span className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    submittedRef.current = true
                    fetcher.submit(
                      { intent: "save-licence-text", text: draft },
                      { method: "post" },
                    )
                  }}
                >
                  {busy && <Spinner />}
                  {busy ? "Saving…" : "Save"}
                </Button>
              </span>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
          </CardFrameAction>
        )}
      </CardFrameHeader>
      <Card>
        <CardPanel>
          {!hasText && !editing ? (
            <p className="py-2 text-muted-foreground text-sm">
              No licence text could be downloaded for this licence
              {licence.url ? (
                <>
                  {" — read it at "}
                  <a
                    href={licence.url}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all underline-offset-2 hover:underline"
                  >
                    {licence.url}
                  </a>
                  .
                </>
              ) : (
                "."
              )}
              {superadmin && " Use Edit to write it by hand."}
            </p>
          ) : editing ? (
            // react-remark has no editor, so the source is edited as raw
            // markdown in a textarea. Controlled so Save reads `draft`; focus
            // the textarea on open to match the previous editor's behaviour.
            <Textarea
              autoFocus
              aria-label="Licence markdown source"
              value={draft}
              onChange={(event) => setDraft(event.currentTarget.value)}
              className="min-h-96 font-mono text-sm leading-relaxed"
            />
          ) : (
            // Read-only markdown rendered to React elements by react-remark.
            <div className="licence-prose">{rendered}</div>
          )}
          {fetcher.data?.ok === false && fetcher.data.error && (
            <p role="alert" className="mt-2 text-destructive text-sm">
              {fetcher.data.error}
            </p>
          )}
        </CardPanel>
      </Card>
    </CardFrame>
  )
}

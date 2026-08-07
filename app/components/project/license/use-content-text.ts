import { useEffect, useState } from "react"
import { getLicence, resolveLicenceText } from "@/lib/licenses"

/**
 * The licence body, fetched the first time a viewer shows it.
 *
 * The text is not on the project's loader — it is a per-licence read plus, on a
 * first view, a download from SPDX — so it is fetched when the viewer opens and
 * never on the way to painting the project page.
 *
 * The resolved text is keyed by licence id: one viewer is reused across catalog
 * rows, so a changed `licenceId` has to invalidate the previous body rather
 * than show it under the new title.
 */
export function useContentText(licenceId: string, open: boolean): { text: string | null; loading: boolean } {
    const [resolved, setResolved] = useState<{ id: string; text: string | null } | null>(null)
    const [loading, setLoading] = useState(false)
    const loaded = resolved?.id === licenceId

    useEffect(() => {
        if (!open || loaded) return
        let cancelled = false
        setLoading(true)
        getLicence(licenceId)
            .then(resolveLicenceText)
            .catch(() => null)
            .then(text => {
                if (cancelled) return
                setResolved({ id: licenceId, text })
                setLoading(false)
            })
        // Closing mid-flight must not write state into an unmounted tree, and
        // reopening must not race a second fetch against the first.
        return () => {
            cancelled = true
        }
    }, [open, licenceId, loaded])

    return { text: loaded ? (resolved?.text ?? null) : null, loading }
}

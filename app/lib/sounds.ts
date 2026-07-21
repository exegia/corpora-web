// UI sound layer built on cuelume. Pointer feedback rides on delegated
// `data-cuelume-*` attributes (see ui/button.tsx, ui/checkbox.tsx, …); the
// hooks here cover what attributes can't hear: route changes, action
// results, and deferred skeleton → content transitions.

import { bind, play, setEnabled } from "cuelume"
import { useEffect, useRef } from "react"
import { useFetchers, useLocation } from "react-router"

export { play }

// Cuelume owns playback but not the preference (it does not touch storage);
// mirror the theme pattern: absent key = default (sounds on).
export const SOUND_STORAGE_KEY = "corpora-sounds"

export function getSoundPreference(): boolean {
  if (typeof localStorage === "undefined") return true
  return localStorage.getItem(SOUND_STORAGE_KEY) !== "off"
}

export function setSoundPreference(enabled: boolean): void {
  if (enabled) {
    localStorage.removeItem(SOUND_STORAGE_KEY)
  } else {
    localStorage.setItem(SOUND_STORAGE_KEY, "off")
  }
  setEnabled(enabled)
}

/** Shape every route action in this app resolves to (ok + optional error). */
function isActionResult(data: unknown): data is { ok: boolean } {
  return typeof data === "object" && data !== null && "ok" in data
}

/**
 * Mount once in the app layout: binds the delegated attribute listeners and
 * plays "page" on navigation plus "success"/"error" when an action lands.
 */
export function useUISounds(): void {
  // Idempotent delegated binding for all data-cuelume-* attributes, with
  // the stored preference applied before anything can play.
  useEffect(() => {
    setEnabled(getSoundPreference())
    bind()
  }, [])

  // Route change → "page". The first render is a load, not a navigation.
  const { pathname } = useLocation()
  const previousPathname = useRef(pathname)
  useEffect(() => {
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname
      play("page")
    }
  }, [pathname])

  // Action completion → "success" / "error". Fetcher data objects are new
  // per submission, so a WeakSet dedupes across re-renders without leaking.
  const fetchers = useFetchers()
  const heard = useRef(new WeakSet<object>())
  useEffect(() => {
    for (const fetcher of fetchers) {
      const data: unknown = fetcher.data
      if (isActionResult(data) && !heard.current.has(data)) {
        heard.current.add(data)
        play(data.ok ? "success" : "error")
      }
    }
  })
}

// A skeleton announces pending work; the content that replaces it resolves
// the sound. Module-level so the pair works across the Suspense boundary.
let loadingAnnounced = false

/**
 * Mount in a Suspense fallback. Waits `delayMs` before playing "loading" so
 * instantly-resolved data (a fallback flashing for one tick) stays silent.
 */
export function useLoadingSound(delayMs = 300): void {
  useEffect(() => {
    const timer = setTimeout(() => {
      loadingAnnounced = true
      play("loading")
    }, delayMs)
    return () => clearTimeout(timer)
  }, [delayMs])
}

/** Mount in the resolved content: plays "ready" only after a "loading". */
export function useReadySound(): void {
  useEffect(() => {
    if (loadingAnnounced) {
      loadingAnnounced = false
      play("ready")
    }
  }, [])
}

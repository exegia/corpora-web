// Theme handling: system preference by default, explicit choice persisted.
// The `.dark` class on <html> drives both `color-scheme: dark` (light-dark()
// tokens in app.css) and the `dark:` Tailwind variant.

export type ThemePreference = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

export const THEME_STORAGE_KEY = "corpora-theme"

/**
 * Runs before first paint (inlined in root.tsx) so the correct scheme is on
 * <html> before styles apply. Keep dependency-free and ES5-safe.
 */
export const THEME_INIT_SCRIPT = `(function () {
  try {
    var stored = localStorage.getItem("${THEME_STORAGE_KEY}")
    var dark =
      stored === "dark" ||
      (stored !== "light" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    document.documentElement.classList.toggle("dark", dark)
    // Keep the markdown editor/preview (data-color-mode) in sync pre-paint.
    document.documentElement.setAttribute(
      "data-color-mode",
      dark ? "dark" : "light",
    )
  } catch (e) {}
})()`

export function getThemePreference(): ThemePreference {
  if (typeof localStorage === "undefined") return "system"
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  return stored === "light" || stored === "dark" ? stored : "system"
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference !== "system") return preference
  if (typeof window === "undefined" || !window.matchMedia) return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

export function applyTheme(resolved: ResolvedTheme): void {
  document.documentElement.classList.toggle("dark", resolved === "dark")
  // The uiw markdown editor/preview theme keys off this attribute, not `.dark`.
  document.documentElement.setAttribute("data-color-mode", resolved)
}

export function setThemePreference(preference: ThemePreference): void {
  if (preference === "system") {
    localStorage.removeItem(THEME_STORAGE_KEY)
  } else {
    localStorage.setItem(THEME_STORAGE_KEY, preference)
  }
  applyTheme(resolveTheme(preference))
}

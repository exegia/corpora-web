import { Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  applyTheme,
  getThemePreference,
  type ResolvedTheme,
  resolveTheme,
  setThemePreference,
} from "@/lib/theme"

export default function ThemeToggle() {
  // Server renders light; the effect syncs to what the init script applied.
  const [resolved, setResolved] = useState<ResolvedTheme>("light")

  useEffect(() => {
    setResolved(
      document.documentElement.classList.contains("dark") ? "dark" : "light",
    )
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onSystemChange = () => {
      if (getThemePreference() !== "system") return
      const next = resolveTheme("system")
      applyTheme(next)
      setResolved(next)
    }
    media.addEventListener("change", onSystemChange)
    return () => media.removeEventListener("change", onSystemChange)
  }, [])

  const toggle = () => {
    const next: ResolvedTheme = resolved === "dark" ? "light" : "dark"
    setThemePreference(next)
    setResolved(next)
  }

  return (
    <Button
      aria-label={resolved === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
      size="icon-sm"
      variant="ghost"
    >
      {resolved === "dark" ? <Sun /> : <Moon />}
    </Button>
  )
}

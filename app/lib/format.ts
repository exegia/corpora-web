const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 1000 * 60 * 60 * 24 * 365],
  ["month", 1000 * 60 * 60 * 24 * 30],
  ["day", 1000 * 60 * 60 * 24],
  ["hour", 1000 * 60 * 60],
  ["minute", 1000 * 60],
]

/** "just now", "5 minutes ago", "2 days ago" — for list rows and headers. */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const delta = then - now.getTime()
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
  for (const [unit, ms] of UNITS) {
    if (Math.abs(delta) >= ms) {
      return rtf.format(Math.trunc(delta / ms), unit)
    }
  }
  return "just now"
}

/** "Jan 8, 2026" — for created dates. */
export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

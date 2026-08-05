/**
 * Provider marks in their own brand colours.
 *
 * `@remixicon`'s provider glyphs are single `currentColor` paths, which cannot
 * render Google's four-colour G at all — that is why these are hand-held SVGs
 * rather than a `text-*` class over the icon font.
 *
 * Google keeps its literal palette, which its brand guidelines require and
 * which reads on either theme. Apple and GitHub are monochrome brands, so they
 * stay `currentColor` and inherit the row's foreground — flipping correctly in
 * dark mode, which a hard-coded #181717 would not.
 */

import type { SocialProvider } from "@exegia/corpora-ui"
import type * as React from "react"

type MarkProps = { className?: string }

function GoogleMark({ className }: MarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3.01h3.88c2.27-2.09 3.58-5.17 3.58-8.82Z"
        fill="#4285F4"
      />
      <path
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.88-3.01c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.11A12 12 0 0 0 12 24Z"
        fill="#34A853"
      />
      <path
        d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.62H1.26a12 12 0 0 0 0 10.76l4.01-3.11Z"
        fill="#FBBC05"
      />
      <path
        d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.26 6.62l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
        fill="#EA4335"
      />
    </svg>
  )
}

function AppleMark({ className }: MarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.05 12.04c-.03-2.75 2.25-4.07 2.35-4.13-1.28-1.87-3.27-2.13-3.98-2.16-1.69-.17-3.31 1-4.17 1-.86 0-2.19-.98-3.6-.95-1.85.03-3.56 1.08-4.51 2.73-1.93 3.34-.49 8.28 1.38 10.99.92 1.32 2.01 2.81 3.45 2.75 1.39-.06 1.91-.89 3.59-.89 1.68 0 2.15.89 3.61.86 1.49-.03 2.44-1.35 3.35-2.68 1.06-1.53 1.49-3.02 1.51-3.1-.03-.01-2.9-1.11-2.93-4.42M14.3 3.87c.76-.92 1.28-2.2 1.13-3.48-1.1.05-2.43.73-3.22 1.65-.71.81-1.33 2.11-1.16 3.36 1.23.1 2.48-.62 3.25-1.53" />
    </svg>
  )
}

function GitHubMark({ className }: MarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.21.7.83.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z" />
    </svg>
  )
}

const MARKS: Partial<Record<SocialProvider, React.ComponentType<MarkProps>>> = {
  google: GoogleMark,
  apple: AppleMark,
  github: GitHubMark,
}

/**
 * The brand mark for a provider. Returns `null` for one we have no artwork
 * for, so a provider added upstream degrades to a label rather than crashing.
 */
export function BrandMark({
  provider,
  className,
}: {
  provider: SocialProvider
  className?: string
}): React.ReactElement | null {
  const Mark = MARKS[provider]
  return Mark ? <Mark className={className} /> : null
}

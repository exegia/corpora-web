import type { SocialProvider } from "@exegia/corpora-ui"
import type * as React from "react"
import AppleMark from "@/components/brand-marks/apple"
import GitHubMark from "@/components/brand-marks/github"
import GoogleMark from "@/components/brand-marks/google"
import type { MarkProps } from "@/components/brand-marks/types"

const MARKS: Partial<Record<SocialProvider, React.ComponentType<MarkProps>>> = {
  google: GoogleMark,
  apple: AppleMark,
  github: GitHubMark,
}

/**
 * The brand mark for a provider. Returns `null` for one we have no artwork
 * for, so a provider added upstream degrades to a label rather than crashing.
 */
export default function BrandMark({
  provider,
  className,
}: {
  provider: SocialProvider
  className?: string
}): React.ReactElement | null {
  const Mark = MARKS[provider]
  return Mark ? <Mark className={className} /> : null
}

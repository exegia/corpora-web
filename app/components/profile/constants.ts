/**
 * Named rather than "tab-1"/"tab-2" so the value survives being reordered, and
 * so a future `?tab=` query param has something stable to map onto.
 */
export const PROFILE_TAB = {
  general: "general",
  security: "security",
  projects: "projects",
  references: "references",
} as const

/** Action intents. `save` is the implicit default when none is submitted. */
export const PROFILE_INTENT = {
  deleteAccount: "delete-account",
} as const

/**
 * GitHub's phrasing, and its reasoning: long enough that muscle memory cannot
 * produce it, and it names the thing being destroyed rather than the verb.
 */
export const DELETE_ACCOUNT_PHRASE = "delete my account"

export const LAST_METHOD_EXPLANATION =
  "This is your only way to sign in, so it can't be disconnected."

/** Matches the auth blocks' easing so the card moves like the rest of the kit. */
export const EASE = [0.22, 1, 0.36, 1] as const

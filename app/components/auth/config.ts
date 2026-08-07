import type { AuthAccent, SocialProvider } from "@exegia/corpora-ui"

/** Brand accent applied to every auth block's primary action. */
export const ACCENT: AuthAccent = "corpora"

/**
 * Social providers offered on login and signup.
 *
 * Each one must also be enabled in the Supabase dashboard (Authentication →
 * Providers) and its callback allowlisted under URL Configuration. Trim this
 * array to `[]` to hide the section entirely.
 */
export const PROVIDERS: SocialProvider[] = ["google", "apple"]

/**
 * How long the success state stays up before the route navigates away. Long
 * enough for the block's morph to read, short enough not to feel like a stall.
 */
export const SUCCESS_MORPH_MS = 450

import type { ComponentProps } from "react"
import type { LinkedAccountsBlock, SOCIAL_PROVIDERS } from "@exegia/corpora-ui"

// corpora-ui 2.x no longer exports these auth types at its package root.
// Derive them from public component contracts rather than private file paths.
export type SocialProvider = keyof typeof SOCIAL_PROVIDERS
export type LinkedIdentity = NonNullable<ComponentProps<typeof LinkedAccountsBlock>["identities"]>[number]

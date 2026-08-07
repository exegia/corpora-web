import { SOCIAL_PROVIDERS } from "@exegia/corpora-ui"
import type { LinkedIdentity, SocialProvider } from "@exegia/corpora-ui"
import type { Identity } from "@/lib/auth"

/** Narrows a GoTrue provider string to one the block can draw an icon for. */
export function isSocialProvider(provider: string): provider is SocialProvider {
  return provider in SOCIAL_PROVIDERS
}

/**
 * The email/password identity is filtered out: it is managed by the email and
 * password rows above, not by connect/disconnect buttons. Its presence still
 * reaches the block through `hasOtherSignInMethods`, so the last-method guard
 * only engages when a social identity really is the only way in.
 */
export function toLinkedIdentities(identities: Identity[]): LinkedIdentity[] {
  return identities.flatMap((identity) =>
    isSocialProvider(identity.provider)
      ? [
          {
            id: identity.identityId,
            provider: identity.provider,
            email: identity.email,
          },
        ]
      : [],
  )
}

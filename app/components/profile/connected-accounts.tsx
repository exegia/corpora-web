import { SOCIAL_PROVIDERS } from "@exegia/corpora-ui"
import type { SocialProvider } from "@exegia/corpora-ui"
import { AnimatePresence, motion } from "motion/react"
import { useId, useState } from "react"
import { useRevalidator } from "react-router"
import { Auth } from "@/components/auth"
import { Brand } from "@/components/brand-marks"
import { Button } from "@/components/ui/button"
import { FramePanel } from "@/components/ui/frame"
import ConnectedAccountsFrame from "@/components/profile/frame"
import { EASE, LAST_METHOD_EXPLANATION } from "@/components/profile/constants"
import IdentityRow from "@/components/profile/identity-row"
import { toLinkedIdentities } from "@/components/profile/utils"
import { type Identity, linkProvider, unlinkProvider } from "@/lib/auth"
import { play } from "@/lib/sounds"

/**
 * The sign-in identities card.
 *
 * Composed here rather than using `LinkedAccountsBlock`: the block's marks are
 * single-colour `currentColor` glyphs, and Google's four-colour G cannot be
 * produced from one by any amount of CSS. Owning the markup also buys the
 * compact connect row and the per-row motion.
 *
 * The behaviour is a deliberate port of the block, not a redesign of it —
 * the last-method guard, the `busy` gate that keeps a double-click from firing
 * two requests, and the inline rejection message all carry over unchanged.
 * `profile.test.tsx` covers each and must keep passing untouched.
 *
 * `linkProvider` navigates the document away on success, so its promise
 * settling always means failure — hence the catch that renders the reason.
 * After an unlink the route revalidates; the resolved card stays mounted while
 * the fresh list loads (see docs/data-loading.md).
 */
export default function ConnectedAccounts({ identities }: { identities: Identity[] | null }) {
  const revalidator = useRevalidator()
  const guardId = useId()
  const [error, setError] = useState<string | null>(null)
  const [linking, setLinking] = useState<SocialProvider | null>(null)
  const [unlinking, setUnlinking] = useState<string | null>(null)

  if (identities === null) {
    return (
      <ConnectedAccountsFrame>
        <FramePanel>
          <p className="text-sm text-destructive">
            We couldn't load your connected accounts. Reload the page to try
            again.
          </p>
        </FramePanel>
      </ConnectedAccountsFrame>
    )
  }

  const linked = toLinkedIdentities(identities)
  const connected = new Set(linked.map((identity) => identity.provider))
  const connectable = Auth.PROVIDERS.filter(
    (provider) => !connected.has(provider),
  )
  const busy = linking !== null || unlinking !== null
  // The backend rule, enforced here so we never fire a request that would
  // remove the account's only way in. An off-list method — the email/password
  // credential — keeps the account reachable, so it lifts the guard.
  const lastMethod =
    !identities.some((i) => i.provider === "email") && linked.length <= 1

  async function connect(provider: SocialProvider) {
    if (busy) return
    setError(null)
    setLinking(provider)
    try {
      await linkProvider(provider)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to connect account.",
      )
      play("error")
    } finally {
      setLinking(null)
    }
  }

  async function disconnect(identityId: string) {
    if (busy || lastMethod) return
    setError(null)
    setUnlinking(identityId)
    try {
      await unlinkProvider(identityId)
      // The loader is the source of truth; hold the row's spinner until the
      // refreshed list is in.
      await revalidator.revalidate()
      // The press itself is already audible through the button's delegated
      // cuelume attributes; this marks the round-trip landing, which they
      // cannot hear.
      play("success")
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to disconnect account.",
      )
      play("error")
    } finally {
      setUnlinking(null)
    }
  }

  return (
    <ConnectedAccountsFrame>
      <FramePanel>
        <motion.div
          className="flex flex-col gap-4"
          layout
          transition={{ duration: 0.3, ease: EASE }}
        >
          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}

          {linked.length > 0 ? (
            <ul aria-label="Connected accounts" className="flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {linked.map((identity) => (
                  <IdentityRow
                    busy={unlinking === identity.id}
                    disabled={busy || lastMethod}
                    guardId={guardId}
                    guarded={lastMethod}
                    identity={identity}
                    key={identity.id}
                    onUnlink={() => void disconnect(identity.id)}
                  />
                ))}
              </AnimatePresence>
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              No sign-in methods connected yet.
            </p>
          )}

          {lastMethod && linked.length > 0 && (
            <p className="text-muted-foreground text-xs" id={guardId}>
              {LAST_METHOD_EXPLANATION}
            </p>
          )}

          {connectable.length > 0 && (
            <div className="flex flex-col gap-2">
              {linked.length > 0 && (
                <span className="text-muted-foreground text-xs">
                  Add another way to sign in
                </span>
              )}
              {/* Sized to their labels and wrapped, rather than one full-width
                  button per provider: at this card's width a stacked pair read
                  as a giant target for a secondary action. */}
              <div className="flex flex-wrap gap-2">
                {connectable.map((provider) => (
                  <Button
                    disabled={busy}
                    key={provider}
                    loading={linking === provider}
                    onClick={() => void connect(provider)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Brand.Mark className="size-4" provider={provider} />
                    Connect {SOCIAL_PROVIDERS[provider].label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </FramePanel>
    </ConnectedAccountsFrame>
  )
}

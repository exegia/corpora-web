import { SOCIAL_PROVIDERS } from "@exegia/corpora-ui"
import type { LinkedIdentity } from "@exegia/corpora-ui"
import { motion } from "motion/react"
import { Brand } from "@/components/brand-marks"
import { Button } from "@/components/ui/button"
import { EASE } from "@/components/profile/constants"

/** One connected identity: brand mark, provider, account, disconnect. */
export default function IdentityRow({
  identity,
  disabled,
  guarded,
  guardId,
  busy,
  onUnlink,
}: {
  identity: LinkedIdentity
  disabled: boolean
  guarded: boolean
  guardId: string
  busy: boolean
  onUnlink: () => void
}) {
  const { label } = SOCIAL_PROVIDERS[identity.provider]
  return (
    <motion.li
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2.5"
      exit={{ opacity: 0, y: -4 }}
      initial={{ opacity: 0, y: -4 }}
      layout
      transition={{ duration: 0.25, ease: EASE }}
    >
      {/* A tile rather than a bare glyph: it gives the coloured marks a
          consistent footprint, so Google's square G and Apple's tall
          silhouette do not make the rows look ragged. */}
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/40">
        <Brand.Mark className="size-4" provider={identity.provider} />
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="font-medium text-sm leading-tight">{label}</span>
        {identity.email && (
          <span className="truncate text-muted-foreground text-xs">
            {identity.email}
          </span>
        )}
      </div>
      {/* Destructive-outline, not ghost: disconnecting is the one irreversible
          thing on this card, and the colour is the only cue that says so. */}
      <Button
        aria-describedby={guarded ? guardId : undefined}
        aria-label={`Disconnect ${label}`}
        className="ml-auto"
        disabled={disabled}
        loading={busy}
        onClick={onUnlink}
        size="sm"
        type="button"
        variant="destructive-outline"
      >
        Disconnect
      </Button>
    </motion.li>
  )
}

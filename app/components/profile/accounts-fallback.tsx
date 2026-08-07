import { FramePanel } from "@/components/ui/frame"
import ConnectedAccountsFrame from "@/components/profile/frame"

/**
 * The deferred fallback, in the same shell so the card does not re-chrome. The
 * skeleton rows match `IdentityRow`'s height and tile, so the resolved list
 * lands in place instead of shunting the card's height as it arrives.
 */
export default function ConnectedAccountsFallback() {
  return (
    <ConnectedAccountsFrame>
      <FramePanel>
        <div
          aria-label="Loading connected accounts"
          className="flex flex-col gap-2"
          role="status"
        >
          {[0, 1].map((row) => (
            <div
              className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
              key={row}
            >
              <span className="size-8 shrink-0 animate-pulse rounded-md bg-muted" />
              <span className="h-3.5 w-28 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </FramePanel>
    </ConnectedAccountsFrame>
  )
}

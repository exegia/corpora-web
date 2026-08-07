import { Blocks } from "@/components/blocks"
import { Button } from "@/components/ui/button"
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame"
import { DELETE_ACCOUNT_PHRASE, PROFILE_INTENT } from "@/components/profile/constants"

/**
 * The irreversible corner, in its own card and styled like GitHub's: a
 * destructive-bordered panel, a red button, and a dialog that will not submit
 * until the phrase is typed in full. The phrase is a sentence rather than one
 * word precisely because it cannot be typed by reflex.
 */
export default function DangerZoneCard() {
  return (
    <Frame>
      <FrameHeader>
        <FrameTitle className="text-destructive">Danger zone</FrameTitle>
        <FrameDescription>
          Irreversible actions. Please be certain.
        </FrameDescription>
      </FrameHeader>
      <FramePanel className="flex flex-wrap items-center justify-between gap-4 border-destructive/48">
        <div className="flex min-w-0 flex-col">
          <span className="font-medium text-sm">Delete this account</span>
          <span className="text-muted-foreground text-sm">
            Your profile, projects and corpora are removed permanently.
          </span>
        </div>
        <Blocks.ConfirmDelete
          confirmLabel="Delete this account"
          confirmWord={DELETE_ACCOUNT_PHRASE}
          description="This permanently removes your account, profile, projects and corpora. It cannot be undone."
          intent={PROFILE_INTENT.deleteAccount}
          title="Delete your account?"
          trigger={<Button size="sm" variant="destructive" />}
          triggerLabel="Delete account"
        />
      </FramePanel>
    </Frame>
  )
}

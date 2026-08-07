import { Frame, FrameDescription, FrameHeader, FrameTitle } from "@/components/ui/frame"

/**
 * The card shell, shared by all three states. Loading, error and loaded each
 * render it, so the header cannot drift between them and the card does not
 * change shape as the deferred identities resolve.
 */
export default function ConnectedAccountsFrame({ children }: { children: React.ReactNode }) {
  return (
    <Frame>
      <FrameHeader>
        <FrameTitle>Connected accounts</FrameTitle>
        <FrameDescription>
          Manage the accounts you can use to sign in.
        </FrameDescription>
      </FrameHeader>
      {children}
    </Frame>
  )
}

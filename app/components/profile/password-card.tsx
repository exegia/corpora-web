import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame"
import { sendPasswordReset } from "@/lib/auth"
import { play } from "@/lib/sounds"

/**
 * Password reset. Deliberately the emailed-link flow rather than an inline
 * old/new password pair: the link proves control of the mailbox, which is what
 * makes it safe on an already-open session someone else may have walked up to.
 * Reuses `sendPasswordReset` — the same call behind /forgot-password — so the
 * link lands on /reset-password exactly as it does when signed out.
 */
export default function PasswordCard({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle")
  const [error, setError] = useState<string | null>(null)

  async function send() {
    if (state === "sending" || !email) return
    setError(null)
    setState("sending")
    try {
      await sendPasswordReset(email)
      setState("sent")
      play("success")
    } catch (cause) {
      setState("idle")
      setError(
        cause instanceof Error ? cause.message : "Unable to send the reset link.",
      )
      play("error")
    }
  }

  return (
    <Frame>
      <FrameHeader>
        <FrameTitle>Password</FrameTitle>
        <FrameDescription>
          Change the password you use to sign in with email.
        </FrameDescription>
      </FrameHeader>
      <FramePanel className="flex flex-col items-start gap-3">
        {state === "sent" ? (
          <p className="text-muted-foreground text-sm" role="status">
            Sent. Check <span className="text-foreground">{email}</span> for a
            link to set a new password.
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            We'll email <span className="text-foreground">{email}</span> a link
            to set a new one. Your current password keeps working until you do.
          </p>
        )}
        {error && (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        )}
        <Button
          disabled={state === "sending" || !email}
          loading={state === "sending"}
          onClick={() => void send()}
          size="sm"
          type="button"
          variant="outline"
        >
          {state === "sent" ? "Resend reset link" : "Send reset link"}
        </Button>
      </FramePanel>
    </Frame>
  )
}

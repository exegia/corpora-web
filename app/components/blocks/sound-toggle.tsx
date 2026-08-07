import { Volume2, VolumeX } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { getSoundPreference, play, setSoundPreference } from "@/lib/sounds"

/** Mute/unmute the UI sounds; the preference persists like the theme. */
export default function SoundToggle() {
  // Server renders the default; the effect syncs to the stored preference.
  const [enabled, setEnabledState] = useState(true)

  useEffect(() => {
    setEnabledState(getSoundPreference())
  }, [])

  const toggle = () => {
    const next = !enabled
    setSoundPreference(next)
    setEnabledState(next)
    // Audible confirmation only when turning sounds on.
    if (next) play("toggle")
  }

  return (
    <Button
      aria-label={enabled ? "Mute interface sounds" : "Unmute interface sounds"}
      aria-pressed={!enabled}
      onClick={toggle}
      size="icon-sm"
      variant="ghost"
    >
      {enabled ? <Volume2 /> : <VolumeX />}
    </Button>
  )
}

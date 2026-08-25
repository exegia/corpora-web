import {
  BadgeCheckIcon,
  BookMarkedIcon,
  FolderKanbanIcon,
  ShieldCheckIcon,
  UploadIcon,
  UserIcon,
  XIcon,
} from "lucide-react"
import { MotionConfig } from "motion/react"
import { Suspense, useMemo, useRef, useState } from "react"
import { Await, useFetcher } from "react-router"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/ui/frame"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  AuthError,
  deleteAccount,
  getCurrentUser,
  listIdentities,
} from "@/lib/auth"
import Profile, { TRADITIONS, VOCATIONS } from "@/lib/profile"
import type { Route } from "./+types/profile"

/**
 * The signed-in researcher's persona profile.
 *
 * Awaited, not deferred: everything comes off the persisted session — there is
 * no query to hide behind a skeleton (see docs/data-loading.md, "Defer only
 * what is slow").
 */
export async function clientLoader() {
  const [user, profile] = await Promise.all([getCurrentUser(), Profile.GetSet.getProfile()])
  return {
    profile,
    email: user?.email ?? "",
    emailConfirmed: user?.emailConfirmed ?? false,
    // Deliberately not awaited: this one is a GoTrue round-trip, so only the
    // connected-accounts card suspends while the form renders immediately.
    // A load failure resolves to null — never presented as an empty list.
    identities: listIdentities().catch(() => null),
  }
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const form = await request.formData()
  const field = (name: string) => String(form.get(name) ?? "")

  if (field("intent") === PROFILE_INTENT.deleteAccount) {
    try {
      await deleteAccount()
      // Nothing local survives the account, so leave rather than revalidate
      // into a page whose loader now 401s.
      window.location.assign("/login")
      return { ok: true as const }
    } catch (error) {
      if (error instanceof AuthError) {
        return { ok: false as const, error: error.message }
      }
      return {
        ok: false as const,
        error: "Something went wrong. Your account was not deleted.",
      }
    }
  }

  try {
    await Profile.GetSet.updateProfile({
      name: field("name"),
      username: field("username").replace(/^@+/, ""),
      avatarUrl: field("avatarUrl"),
      vocation: field("vocation"),
      tradition: field("tradition"),
      languages: field("languages"),
      affiliation: field("affiliation"),
      website: field("website").replace(/^https?:\/\//, ""),
      bio: field("bio"),
    })
    return { ok: true as const }
  } catch (error) {
    if (error instanceof AuthError) return { ok: false as const, error: error.message }
    return {
      ok: false as const,
      error: "Something went wrong. Your profile was not saved.",
    }
  }
}

/** "Ada Researcher" → "AR"; same rule as the header menu. */
function initials(name: string, email: string): string {
  const source = name.trim()
  if (!source) return (email[0] ?? "?").toUpperCase()
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

/** The editable fields, as the form holds them (never null — empty is ""). */
type Draft = {
  name: string
  username: string
  avatarUrl: string
  vocation: string
  tradition: string
  languages: string
  affiliation: string
  website: string
  bio: string
}

function toDraft(profile: Route.ComponentProps["loaderData"]["profile"]): Draft {
  return {
    name: profile.name ?? "",
    username: profile.username ?? "",
    avatarUrl: profile.avatarUrl ?? "",
    vocation: profile.vocation ?? "",
    tradition: profile.tradition ?? "",
    languages: profile.languages ?? "",
    affiliation: profile.affiliation ?? "",
    website: profile.website ?? "",
    bio: profile.bio ?? "",
  }
}

/**
 * Shrink a picked portrait to a compact data URL. Stored in `user_metadata`
 * alongside the rest of the profile — there is no avatars storage bucket yet,
 * and at ≤256px WebP the payload stays a few tens of kilobytes. Swap for a
 * bucket upload when one exists.
 */
async function toAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d")
    if (!context) throw new Error("no 2d context")
    context.drawImage(bitmap, 0, 0, width, height)
    return canvas.toDataURL("image/webp", 0.85)
  } finally {
    bitmap.close()
  }
}

import { Account } from "@/components/profile"
import Row from "@/components/profile/row"
import RowControl from "@/components/profile/row-control"
import RowLabel from "@/components/profile/row-label"
import { PROFILE_INTENT, PROFILE_TAB } from "@/components/profile/constants"


export default function Profile({ loaderData }: Route.ComponentProps) {
  const { profile, email, emailConfirmed } = loaderData
  const fetcher = useFetcher<typeof clientAction>()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const saving = fetcher.state !== "idle"
  const saved = fetcher.state === "idle" && fetcher.data?.ok === true
  const error = fetcher.state === "idle" && fetcher.data?.ok === false
    ? fetcher.data.error
    : null

  const initial = useMemo(() => toDraft(profile), [profile])
  const [draft, setDraft] = useState(initial)
  const [photoError, setPhotoError] = useState<string | null>(null)

  const set = (key: keyof Draft) => (value: string) =>
    setDraft((current) => ({ ...current, [key]: value }))

  // A successful save revalidates the loader, `initial` catches up to what
  // was typed, and the button disables itself again.
  const dirty = (Object.keys(initial) as (keyof Draft)[]).some(
    (key) => draft[key].trim() !== initial[key],
  )

  async function pickPhoto(file: File | undefined) {
    if (!file) return
    setPhotoError(null)
    try {
      set("avatarUrl")(await toAvatarDataUrl(file))
    } catch {
      setPhotoError("That image could not be read.")
    }
  }

  return (
    /* The identity rows animate through motion/react, whose reduced-motion
       handling is opt-in — unlike the `motion-reduce:` utilities used
       elsewhere, it does not read the media query on its own. The upstream
       block carried this; composing the card locally dropped it. */
    <MotionConfig reducedMotion="user">
    <Tabs
      className="mx-auto w-full max-w-3xl gap-6"
      defaultValue={PROFILE_TAB.general}
    >
      <TabsList>
        <TabsTab value={PROFILE_TAB.general}>
          <UserIcon aria-hidden="true" />
          General
        </TabsTab>
        <TabsTab value={PROFILE_TAB.security}>
          <ShieldCheckIcon aria-hidden="true" />
          Sign-in and security
        </TabsTab>
        {/* Not built yet. Present so the shape of the page is honest about
            what is coming, disabled so it cannot be selected — Base UI keeps
            it focusable and marks it `aria-disabled`, which is what tells a
            screen reader "exists, not available" rather than hiding it. */}
        <TabsTab disabled value={PROFILE_TAB.projects}>
          <FolderKanbanIcon aria-hidden="true" />
          Projects
        </TabsTab>
        <TabsTab disabled value={PROFILE_TAB.references}>
          <BookMarkedIcon aria-hidden="true" />
          References
        </TabsTab>
      </TabsList>

      <TabsPanel className="flex flex-col gap-6" value={PROFILE_TAB.general}>
      <fetcher.Form className="flex flex-col gap-6" method="post">
        <Frame>
          {/* The save control lives in the header of the first card because
              one form spans both cards — a footer button under the second
              would look like it only saved that one. It is absent until
              something is dirty, so the header stays quiet at rest and the
              button's appearance is itself the "unsaved changes" signal. */}
          <FrameHeader className="flex-row items-start justify-between gap-4">
            <div className="flex flex-col">
              <FrameTitle>Profile</FrameTitle>
              <FrameDescription>
                How you appear across the Corpora workspace.
              </FrameDescription>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span aria-live="polite" className="text-sm">
                {error ? <span className="text-destructive">{error}</span> : null}
                {saved && !error && !dirty ? (
                  <span className="text-muted-foreground">Profile saved.</span>
                ) : null}
              </span>
              {dirty || saving ? (
                <Button loading={saving} size="sm" type="submit">
                  Save changes
                </Button>
              ) : null}
            </div>
          </FrameHeader>

          <FramePanel className="py-0">
          <Row>
            <RowLabel
              title="Profile Photo"
              hint="Shown in comments and mentions."
            />
            <RowControl>
              {/*
                The controls sit on the avatar rather than beside it, revealed
                on hover. `focus-within` is not decoration: opacity alone
                leaves the buttons focusable, so without it a keyboard user
                would tab into controls they cannot see. Both states drive the
                same class, which is also what makes the hover path testable —
                a synthetic hover does not produce `:hover` in the pane, but
                a real `.focus()` does fire `:focus-within` (docs/testing.md).
              */}
              <div className="group/avatar relative size-20 shrink-0 rounded-full">
                <Avatar className="size-20">
                  {draft.avatarUrl ? (
                    <AvatarImage alt="" src={draft.avatarUrl} />
                  ) : null}
                  <AvatarFallback className="text-lg">
                    {initials(draft.name, email)}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    "absolute inset-0 flex items-center justify-center gap-1 rounded-full",
                    "bg-background/64 opacity-0 backdrop-blur-[1px]",
                    "transition-opacity duration-150 ease-smooth-out",
                    "group-hover/avatar:opacity-100 group-focus-within/avatar:opacity-100",
                    "motion-reduce:transition-none",
                  )}
                >
                  <Button
                    aria-label="Change profile photo"
                    onClick={() => fileInputRef.current?.click()}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <UploadIcon aria-hidden="true" />
                  </Button>
                  {draft.avatarUrl ? (
                    <Button
                      aria-label="Remove profile photo"
                      onClick={() => set("avatarUrl")("")}
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      <XIcon aria-hidden="true" />
                    </Button>
                  ) : null}
                </div>
              </div>
              <input
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  void pickPhoto(event.target.files?.[0])
                  // Same file picked twice should still fire onChange.
                  event.target.value = ""
                }}
                ref={fileInputRef}
                type="file"
              />
              <input name="avatarUrl" type="hidden" value={draft.avatarUrl} />
              {photoError ? (
                <span className="mt-2 text-sm text-destructive">{photoError}</span>
              ) : null}
            </RowControl>
          </Row>

          <Row>
            <RowLabel
              htmlFor="profile-name"
              title="Full Name"
              hint="Used across Corpora."
            />
            <RowControl>
              <Input
                id="profile-name"
                name="name"
                autoComplete="name"
                placeholder="Ada Researcher"
                value={draft.name}
                onChange={(event) => set("name")(event.target.value)}
              />
            </RowControl>
          </Row>

          <Row>
            <RowLabel
              htmlFor="profile-email"
              title="Email Address"
              hint="Primary sign-in email."
              badge={
                emailConfirmed ? (
                  <Badge variant="success">
                    <BadgeCheckIcon aria-hidden="true" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="warning">Unverified</Badge>
                )
              }
            />
            <RowControl>
              {/* Changing the sign-in email re-triggers verification — a flow
                  of its own, so the field is read-only here. */}
              <Input id="profile-email" readOnly value={email} />
            </RowControl>
          </Row>

          <Row>
            <RowLabel
              htmlFor="profile-username"
              title="Username"
              hint="Used in mentions and links."
            />
            <RowControl>
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>@</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id="profile-username"
                  name="username"
                  autoComplete="username"
                  placeholder="adaresearcher"
                  value={draft.username}
                  onChange={(event) => set("username")(event.target.value)}
                />
              </InputGroup>
            </RowControl>
          </Row>
          </FramePanel>
        </Frame>

        {/* "About you" rather than "Additional Info": these fields are not
            leftovers, they are the scholarly identity other people read —
            vocation, tradition, languages, affiliation, bio. Naming them by
            what they are beats naming them by what they are not. */}
        <Frame>
          <FrameHeader>
            <FrameTitle>About you</FrameTitle>
            <FrameDescription>
              Your background and where to find you. Shown on your public
              profile.
            </FrameDescription>
          </FrameHeader>

          <FramePanel className="py-0">
          <Row>
            <RowLabel
              title="Persona"
              hint="Your vocation and the tradition you work within, shown across Corpora."
            />
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="profile-vocation">Vocation</Label>
                <Select
                  value={draft.vocation}
                  onValueChange={(next) => set("vocation")(String(next ?? ""))}
                >
                  <SelectTrigger className="w-full" id="profile-vocation">
                    <SelectValue>
                      {(value: string) =>
                        value || (
                          <span className="text-muted-foreground">
                            Select a vocation
                          </span>
                        )
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectPopup>
                    <SelectItem value="">
                      <span className="text-muted-foreground">Unspecified</span>
                    </SelectItem>
                    {VOCATIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
                <input name="vocation" type="hidden" value={draft.vocation} />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="profile-tradition">Tradition</Label>
                <Select
                  value={draft.tradition}
                  onValueChange={(next) => set("tradition")(String(next ?? ""))}
                >
                  <SelectTrigger className="w-full" id="profile-tradition">
                    <SelectValue>
                      {(value: string) =>
                        value || (
                          <span className="text-muted-foreground">
                            Select a tradition
                          </span>
                        )
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectPopup>
                    <SelectItem value="">
                      <span className="text-muted-foreground">Unspecified</span>
                    </SelectItem>
                    {TRADITIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
                <input name="tradition" type="hidden" value={draft.tradition} />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="profile-languages">Working languages</Label>
                <Input
                  id="profile-languages"
                  name="languages"
                  placeholder="Latin, Koine Greek, Syriac"
                  value={draft.languages}
                  onChange={(event) => set("languages")(event.target.value)}
                />
              </div>
            </div>
          </Row>

          <Row>
            <RowLabel
              title="Public Details"
              hint="Where you work and where to find you."
            />
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="profile-affiliation">Affiliation</Label>
                <Input
                  id="profile-affiliation"
                  name="affiliation"
                  autoComplete="organization"
                  placeholder="University of Tübingen"
                  value={draft.affiliation}
                  onChange={(event) => set("affiliation")(event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="profile-website">Website</Label>
                <InputGroup>
                  <InputGroupAddon>
                    <InputGroupText>https://</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    id="profile-website"
                    name="website"
                    autoComplete="url"
                    placeholder="ada.example.org"
                    value={draft.website}
                    onChange={(event) => set("website")(event.target.value)}
                  />
                </InputGroup>
              </div>
            </div>
          </Row>

          <Row>
            <RowLabel
              htmlFor="profile-bio"
              title="Bio"
              hint="Short profile summary."
            />
            <Textarea
              id="profile-bio"
              name="bio"
              rows={4}
              placeholder="Translating and collating late-antique manuscripts."
              value={draft.bio}
              onChange={(event) => set("bio")(event.target.value)}
            />
          </Row>
          </FramePanel>
        </Frame>
      </fetcher.Form>
      </TabsPanel>

      <TabsPanel className="flex flex-col gap-6" value={PROFILE_TAB.security}>
        {/* Still deferred, and still behind its own Suspense boundary: the
            identities request starts with the loader, not when this tab is
            first opened, so switching to it lands on resolved data. */}
        <Suspense fallback={<Account.Fallback />}>
          <Await resolve={loaderData.identities}>
            {(identities) => <Account.ConnectedAccounts identities={identities} />}
          </Await>
        </Suspense>

        <Account.Password email={email} />
        <Account.DangerZone />
      </TabsPanel>
    </Tabs>
    </MotionConfig>
  )
}

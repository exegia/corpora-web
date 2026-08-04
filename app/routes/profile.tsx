import { LinkedAccountsBlock, SOCIAL_PROVIDERS } from "@exegia/corpora-ui"
import type { LinkedIdentity, SocialProvider } from "@exegia/corpora-ui"
import { BadgeCheckIcon, UploadIcon, XIcon } from "lucide-react"
import { Suspense, useMemo, useRef, useState } from "react"
import { Await, useFetcher, useRevalidator } from "react-router"
import { AUTH_PROVIDERS } from "@/components/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Frame,
  FrameDescription,
  FrameFooter,
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
import { Textarea } from "@/components/ui/textarea"
import {
  AuthError,
  getCurrentUser,
  linkProvider,
  listIdentities,
  unlinkProvider,
  type Identity,
} from "@/lib/auth"
import {
  getProfile,
  TRADITIONS,
  updateProfile,
  VOCATIONS,
} from "@/lib/profile"
import type { Route } from "./+types/profile"

/**
 * The signed-in researcher's persona profile.
 *
 * Awaited, not deferred: everything comes off the persisted session — there is
 * no query to hide behind a skeleton (see docs/data-loading.md, "Defer only
 * what is slow").
 */
export async function clientLoader() {
  const [user, profile] = await Promise.all([getCurrentUser(), getProfile()])
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
  try {
    await updateProfile({
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

/** Left column of a row: what the field is and where it shows up. */
function RowLabel({
  htmlFor,
  title,
  hint,
  badge,
}: {
  htmlFor?: string
  title: string
  hint: string
  badge?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-2">
        <Label className="text-sm font-medium" htmlFor={htmlFor}>
          {title}
        </Label>
        {badge}
      </span>
      <span className="text-sm text-muted-foreground">{hint}</span>
    </div>
  )
}

/** A divided row: label left, control right. */
function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-3 border-b py-4 last:border-b-0 sm:grid-cols-2 sm:gap-8 sm:py-5">
      {children}
    </div>
  )
}

/**
 * Wraps a row's single control: without this the grid stretches the control
 * to the (taller) label column's height, leaving the text top-aligned in an
 * oversized box.
 */
function RowControl({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col justify-center">{children}</div>
}

/** Narrows a GoTrue provider string to one the block can draw an icon for. */
function isSocialProvider(provider: string): provider is SocialProvider {
  return provider in SOCIAL_PROVIDERS
}

/**
 * The email/password identity is filtered out: it is managed by the email and
 * password rows above, not by connect/disconnect buttons. That makes the
 * block's last-method guard conservative — an email + one-provider account
 * sees its provider's Disconnect disabled even though the password would keep
 * the account reachable. Safe, but stricter than GoTrue's own rule; lifting it
 * needs a corpora-ui release that can be told about out-of-list methods.
 */
function toLinkedIdentities(identities: Identity[]): LinkedIdentity[] {
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

/**
 * The sign-in identities card. `linkProvider` navigates the document away on
 * success, so its promise settling always means failure — the block renders
 * the rejection inline. After an unlink the route revalidates; the resolved
 * card stays mounted while the fresh list loads (see docs/data-loading.md).
 */
function ConnectedAccounts({ identities }: { identities: Identity[] | null }) {
  const revalidator = useRevalidator()

  if (identities === null) {
    return (
      <Frame>
        <FrameHeader>
          <FrameTitle>Connected accounts</FrameTitle>
          <FrameDescription>
            Manage the accounts you can use to sign in.
          </FrameDescription>
        </FrameHeader>
        <FramePanel>
          <p className="text-sm text-destructive">
            We couldn't load your connected accounts. Reload the page to try
            again.
          </p>
        </FramePanel>
      </Frame>
    )
  }

  return (
    <LinkedAccountsBlock
      identities={toLinkedIdentities(identities)}
      providers={AUTH_PROVIDERS}
      onLink={async (provider) => {
        await linkProvider(provider)
      }}
      onUnlink={async (identityId) => {
        await unlinkProvider(identityId)
        // The loader is the source of truth; hold the row's spinner until the
        // refreshed list is in.
        await revalidator.revalidate()
      }}
    />
  )
}

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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <fetcher.Form method="post">
        <Frame>
          <FrameHeader>
            <FrameTitle>Profile Details</FrameTitle>
            <FrameDescription>
              How you appear across the Corpora workspace.
            </FrameDescription>
          </FrameHeader>

          <FramePanel className="py-0">
          <Row>
            <RowLabel
              title="Profile Photo"
              hint="Shown in comments and mentions."
            />
            <RowControl>
              <div className="flex items-center gap-3">
                <Avatar className="size-10 shrink-0">
                  {draft.avatarUrl ? (
                    <AvatarImage alt="" src={draft.avatarUrl} />
                  ) : null}
                  <AvatarFallback>{initials(draft.name, email)}</AvatarFallback>
                </Avatar>
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
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                  variant="outline"
                >
                  <UploadIcon aria-hidden="true" />
                  Change
                </Button>
                {draft.avatarUrl ? (
                  <Button
                    onClick={() => set("avatarUrl")("")}
                    type="button"
                    variant="ghost"
                  >
                    <XIcon aria-hidden="true" />
                    Remove
                  </Button>
                ) : null}
              </div>
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

          <FrameFooter className="flex items-center justify-end gap-2">
            <span aria-live="polite" className="me-auto text-sm">
              {error ? <span className="text-destructive">{error}</span> : null}
              {saved && !error && !dirty ? (
                <span className="text-muted-foreground">Profile saved.</span>
              ) : null}
            </span>
            <Button disabled={!dirty || saving} loading={saving} type="submit">
              Save changes
            </Button>
          </FrameFooter>
        </Frame>
      </fetcher.Form>

      <Suspense fallback={<LinkedAccountsBlock loading />}>
        <Await resolve={loaderData.identities}>
          {(identities) => <ConnectedAccounts identities={identities} />}
        </Await>
      </Suspense>
    </div>
  )
}

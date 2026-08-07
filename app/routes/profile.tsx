import { SOCIAL_PROVIDERS } from "@exegia/corpora-ui"
import type { LinkedIdentity, SocialProvider } from "@exegia/corpora-ui"
import {
  BadgeCheckIcon,
  BookMarkedIcon,
  FolderKanbanIcon,
  ShieldCheckIcon,
  UploadIcon,
  UserIcon,
  XIcon,
} from "lucide-react"
import { AnimatePresence, motion, MotionConfig } from "motion/react"
import { Suspense, useId, useMemo, useRef, useState } from "react"
import { Await, useFetcher, useRevalidator } from "react-router"
import { Auth } from "@/components/auth"
import { Brand } from "@/components/brand-marks"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { play } from "@/lib/sounds"
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
  linkProvider,
  listIdentities,
  sendPasswordReset,
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
 * password rows above, not by connect/disconnect buttons. Its presence still
 * reaches the block through `hasOtherSignInMethods`, so the last-method guard
 * only engages when a social identity really is the only way in.
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
 * The card shell, shared by all three states. Loading, error and loaded each
 * render it, so the header cannot drift between them and the card does not
 * change shape as the deferred identities resolve.
 */
function ConnectedAccountsFrame({ children }: { children: React.ReactNode }) {
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

/**
 * Named rather than "tab-1"/"tab-2" so the value survives being reordered, and
 * so a future `?tab=` query param has something stable to map onto.
 */
const PROFILE_TAB = {
  general: "general",
  security: "security",
  projects: "projects",
  references: "references",
} as const

/** Action intents. `save` is the implicit default when none is submitted. */
const PROFILE_INTENT = {
  deleteAccount: "delete-account",
} as const

/**
 * GitHub's phrasing, and its reasoning: long enough that muscle memory cannot
 * produce it, and it names the thing being destroyed rather than the verb.
 */
const DELETE_ACCOUNT_PHRASE = "delete my account"

const LAST_METHOD_EXPLANATION =
  "This is your only way to sign in, so it can't be disconnected."

/** Matches the auth blocks' easing so the card moves like the rest of the kit. */
const EASE = [0.22, 1, 0.36, 1] as const

/** One connected identity: brand mark, provider, account, disconnect. */
function IdentityRow({
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
function ConnectedAccounts({ identities }: { identities: Identity[] | null }) {
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

/**
 * Password reset. Deliberately the emailed-link flow rather than an inline
 * old/new password pair: the link proves control of the mailbox, which is what
 * makes it safe on an already-open session someone else may have walked up to.
 * Reuses `sendPasswordReset` — the same call behind /forgot-password — so the
 * link lands on /reset-password exactly as it does when signed out.
 */
function PasswordCard({ email }: { email: string }) {
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

/**
 * The irreversible corner, in its own card and styled like GitHub's: a
 * destructive-bordered panel, a red button, and a dialog that will not submit
 * until the phrase is typed in full. The phrase is a sentence rather than one
 * word precisely because it cannot be typed by reflex.
 */
function DangerZoneCard() {
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
        <ConfirmDeleteDialog
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

/**
 * The deferred fallback, in the same shell so the card does not re-chrome. The
 * skeleton rows match `IdentityRow`'s height and tile, so the resolved list
 * lands in place instead of shunting the card's height as it arrives.
 */
function ConnectedAccountsFallback() {
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
        <Suspense fallback={<ConnectedAccountsFallback />}>
          <Await resolve={loaderData.identities}>
            {(identities) => <ConnectedAccounts identities={identities} />}
          </Await>
        </Suspense>

        <PasswordCard email={email} />
        <DangerZoneCard />
      </TabsPanel>
    </Tabs>
    </MotionConfig>
  )
}

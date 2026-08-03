# Authentication

The screens come from `@exegia/corpora-ui`'s auth blocks, backed by Supabase
Auth. The whole backend surface is one file,
[`app/lib/auth.ts`](../app/lib/auth.ts) — route modules import from there and
never touch `supabase-js`, matching `lib/projects` and `lib/users`.

OAuth goes through `@exegia/use-auth` / `@exegia/plugin-supabase-auth`
(pinned exactly — they move together with the sibling `../corpora-auth` repo).
`app/lib/auth.ts` lazily calls `configureWeb({ client: getSupabase().auth })`
before the first binding runs, so the bindings share the app's supabase-js
session rather than constructing a second GoTrue client that would fight over
token refresh. Lazy rather than a module-scope side effect because tests mock
`@/lib/supabase` and the SPA-mode build imports route modules in Node.

## Routes

| Path | Block | Guard |
| --- | --- | --- |
| `/login` | `LoginBlock` | `requireAnon` |
| `/signup` | `SignupBlock` | `requireAnon` |
| `/forgot-password` | `ForgotPasswordBlock` | `requireAnon` |
| `/verify` | `CodeAuthBlock` | none — has an account, no session yet |
| `/reset-password` | composed locally | none — arrives *signed in* via the recovery link |
| `/auth/callback` | — | none — mid-handshake, neither reliably in nor out |
| `/logout` | — | action-only, `POST` |

`/auth/callback` is where every out-of-app journey lands: an OAuth provider, a
signup confirmation link, or a password-reset link. It exchanges a PKCE `?code=`
for a session (implicit-flow fragments are consumed by supabase-js itself), then
redirects to a vetted `?next=`. Only its failure path renders anything.

**OAuth's return leg is different from the emailed links.** The 0.9.0 web
binding sends no `redirect_to`, so GoTrue returns the browser to the
project's **Site URL** — the app cannot choose the landing page per call, and
the Redirect URLs allowlist is irrelevant to OAuth (it still gates the
emailed links, which pass an explicit `emailRedirectTo`). Because `?next=`
cannot travel through that round-trip, `signInWithProvider` stashes the
post-sign-in destination in sessionStorage and `completeAuthRedirect`
consumes it on landing. On success the provider promise never settles in the
starting document (the page navigates away); it rejects only when the
redirect could not start, with the auth kit's user-facing message for the
structured error kind.

**In production that Site URL is the app root, so OAuth never actually reaches
`/auth/callback`.** Confirmed against the live project — any GoTrue redirect
lands on `https://corpora.exegia.co`. Two consequences worth knowing before
you touch this code:

- Success still works, but only because supabase-js consumes the implicit
  fragment during `detectSessionInUrl` at client start, on whatever route it
  lands on. `requireSession` awaits `getSession()`, which waits for that
  initialisation, so the guard sees the new session.
- The sessionStorage stash above is therefore **inert in production** — nothing
  consumes it, and the post-sign-in `redirectTo` is dropped. Fixing that means
  either pointing Site URL at `/auth/callback` or giving the web binding a
  `redirectTo` (plugin 0.10.0 adds one); it is not fixable from this file.

Failures had the worse version of the same problem: GoTrue reports them in the
URL **fragment**, a fragment never reaches a loader (`Request` drops it), and
the root is guarded — so `requireSession` bounced to `/login` and threw the
reason away. That is what a rejected Apple client secret looked like in prod: a
flash and a silent return to the login screen, with `oauth2: "invalid_client"`
visible only in the Supabase auth log. `requireSession` now reads the fragment
off `window.location` and hands the failure to `/auth/callback`, which is the
one route built to render it. It keys on `error_description`, `error_code` or
`error` — GoTrue populates them inconsistently across its 4xx and 5xx paths,
and a shape we failed to recognise would bounce to `/login` and lose the reason
all over again.

The check sits *after* the session lookup, so an error arriving alongside a
still-valid session is let through rather than shown. That is deliberate: a
signed-in user with a working session has nothing useful to do with a failed
provider handshake, and the failure that motivated this arrives signed out
(the provider round-trip starts from `/login`).

The terms are a **dialog, not a route** —
`app/components/terms-and-conditions-dialog.tsx`, opened from the signup form's
consent checkbox. `SignupBlock` exposes that link as an `onTerms` callback
rather than a render slot, so the route owns the open state and the dialog is
controlled. A dialog rather than a page because reading the terms must not
discard a half-filled form.

Its footer closes and nothing more: consent is the checkbox on the form behind
it, and `SignupBlock` keeps that checkbox in its own state with no prop to set
it, so an "I agree" button could not actually tick it.

The body is a **working draft**, marked as such in the dialog itself, and needs
real reviewed wording before public sign-ups.

`app/routes.ts` puts the first five under `routes/auth-layout.tsx` (centered
card, no sidebar) and everything else under `routes/protected-layout.tsx`,
whose `clientLoader` calls `requireSession` before any child loader runs. That
is why no protected route repeats the check. `root.tsx` is now just an
`<Outlet />`.

`/reset-password` has no upstream block — `ForgotPasswordBlock` only sends the
email — so it is composed from `AuthCard` + `PasswordInput` + `Reveal`, matching
the blocks' progressive-disclosure feel.

## Two things the guards must keep doing

1. **`safeRedirectTo` rejects auth paths.** Both guards read the same
   `?redirectTo=`; if `/login` were an accepted destination the pair would
   ping-pong `/login → / → /login` forever.
2. **It also rejects absolute and protocol-relative URLs** — otherwise
   `?redirectTo=https://evil.example` is an open redirect off the login screen.

Both are pinned by tests in `app/lib/auth.test.ts`.

## RLS: signing in changes which policies apply

**A migration must land before sign-in is usable.** Signing in flips the
Postgres role from `anon` to `authenticated`, and a policy only applies to the
roles it names. Four tables from 001 carry a single `to anon` policy, so a
signed-in user matches nothing — and **RLS denial returns zero rows, not an
error**, so every list page empties silently with no failed request.

Measured on the live project rather than inferred:

```sql
set local role anon;           select count(*) from public.projects;  -- 1
set local role authenticated;  select count(*) from public.projects;  -- 0
```

`supabase/migrations/20260802060000_authenticated_workspace_policies.sql` adds a
parallel `to authenticated` policy for `projects`, `corpora`, `project_corpora`
and `project_references`. Verified by running it inside a transaction and
rolling back: the authenticated count goes 0 → 1.

It adds a second policy rather than widening the existing one to `public`,
because the original is named "(temporary)" and is meant to be dropped — folding
`authenticated` into it would make a blanket permissive policy permanent.

Check the live project, not the migration history, which has drifted:

```bash
supabase db query "select tablename, policyname, roles::text from pg_policies where schemaname='public'" --linked
```

Separately, `public.books` has RLS enabled and **zero** policies, so it is
unreadable by every role including `anon`. That is broken today and unrelated to
auth.

## What the dashboard still has to provide

Three things cannot be set from this repo, and each is unverifiable here:

- **Site URL and the redirect allowlist.** OAuth returns to the **Site URL**
  (see above), so it must point at the app. The emailed links still need
  `/auth/callback` listed under Authentication → URL Configuration → Redirect
  URLs, or they fail on return.
- **Providers.** `AUTH_PROVIDERS` in `app/components/auth` offers Google and
  Apple; each must be enabled under Authentication → Providers **with real
  OAuth credentials** — the dashboard lets a provider be toggled on without a
  secret, and the failure only surfaces at `/authorize` time as
  `validation_failed: missing OAuth secret`. Probe without side effects:
  `curl "https://<ref>.supabase.co/auth/v1/authorize?provider=google" -H "apikey: <publishable>"`.
- **The `/verify` code screen** only works if the "Confirm signup" email template
  sends `{{ .Token }}`. Supabase ships it sending `{{ .ConfirmationURL }}`, in
  which case the user follows a link and lands on `/auth/callback` instead. Both
  routes exist, so either template works — but only one of them makes `/verify`
  reachable.

## Known upstream quirk

`CodeAuthBlock` keys its OTP wrapper on the error message, so after a rejected
code the first keystroke clears the error, remounts the field and drops the rest
of the typed code — the user has to click back into it. Worth fixing in
`../corpora-ui`; nothing this app does can work around it.

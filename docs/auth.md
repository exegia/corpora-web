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

**OAuth's return leg is different from the emailed links.** `signInWithProvider`
asks for its landing page explicitly, passing `redirectTo` —
`/auth/callback?next=…`, absolute — to the web binding, which has supported the
option since plugin 0.10.0. So the destination rides in the URL exactly as it
does for an emailed link, and `completeAuthRedirect` reads it off `?next=`. On
success the provider promise never settles in the starting document (the page
navigates away); it rejects only when the redirect could not start, with the
auth kit's user-facing message for the structured error kind.

**A `redirectTo` GoTrue does not accept fails silently.** It is honoured only
when the URL matches the project's **Redirect URLs** allowlist — glob patterns,
so `https://corpora.exegia.co/**` is what covers the `?next=` form. On a miss
GoTrue does not error: it falls back to the project's **Site URL**, which is the
app root, and the browser lands on `/` with no `?next=` at all.

That is why `signInWithProvider` still writes the destination to sessionStorage
before starting the redirect, and `completeAuthRedirect` reads
`params.get("next") ?? stashed`. The stash is the **fallback**, not the carrier:
if the allowlist ever stops matching, the cost is a suboptimal landing page
rather than a lost continuation, and nothing about it is visible as a failed
request.

Landing on `/` still signs the user in either way — supabase-js consumes the
implicit fragment during `detectSessionInUrl` at client start, on whatever route
it lands on, and `requireSession` awaits `getSession()`, which waits for that
initialisation.

Before 0.10.0 the binding sent no `redirect_to` at all, every round-trip landed
on the Site URL, and the stash was the only carrier — which meant it was
silently inert in production, because nothing on `/` consumed it.

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
- **Manual linking.** The `/profile` connected-accounts card needs
  Authentication → Providers → *Allow manual linking* (config.toml:
  `auth.enable_manual_linking`). Off, GoTrue rejects `linkIdentity` /
  `unlinkIdentity` and `GET /user/identities`; the card renders the mapped
  configuration message rather than crashing, but nothing can be connected.

## Account linking

`/profile` renders `LinkedAccountsBlock` behind `<Await>`; the identities
promise is the one deferred piece of that loader. All calls go through
`lib/auth`: `listIdentities`, `linkProvider`, `unlinkProvider`.

- **Linking is a full OAuth round-trip on the current session.** `linkProvider`
  navigates the document away, so its promise settling always means failure —
  the return leg lands on `/auth/callback?next=/profile` exactly like sign-in,
  with the same sessionStorage stash as fallback.
- **The email identity stays in `listIdentities`' result** but is filtered out
  of the card: it is managed by the email field, not connect buttons. Until the
  block can be told about off-list methods (corpora-ui PR #57,
  `hasOtherSignInMethods`), that makes the last-method guard conservative — an
  email + one-provider account cannot disconnect its provider even though the
  password would keep the account reachable. Pinned by a test in
  `app/routes/profile.test.tsx`.
- **GoTrue enforces at-least-one-identity server-side**; the card's guard is
  UX, not the security boundary.

## Known upstream quirk

`CodeAuthBlock` keys its OTP wrapper on the error message, so after a rejected
code the first keystroke clears the error, remounts the field and drops the rest
of the typed code — the user has to click back into it. Worth fixing in
`../corpora-ui`; nothing this app does can work around it.

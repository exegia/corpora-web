# Authentication

The screens come from `@exegia/corpora-ui`'s auth blocks, backed by Supabase
Auth. The whole backend surface is one file,
[`app/lib/auth.ts`](../app/lib/auth.ts) — route modules import from there and
never touch `supabase-js`, matching `lib/projects` and `lib/users`.

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

- **Redirect allowlist.** `/auth/callback` must be listed under Authentication →
  URL Configuration → Redirect URLs, or OAuth and every emailed link fail on
  return.
- **Providers.** `AUTH_PROVIDERS` in `app/components/auth` offers Google and
  GitHub; each must be enabled under Authentication → Providers.
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

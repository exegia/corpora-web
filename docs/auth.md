# Authentication

The screens come from `@exegia/corpora-ui`'s auth blocks. **Nothing is wired to
Supabase yet** — this is the UI stage. The whole backend surface is one file,
[`app/lib/auth.ts`](../app/lib/auth.ts), and swapping it for Supabase Auth
should not move a single route module or component.

## Routes

| Path | Block | Guard |
| --- | --- | --- |
| `/login` | `LoginBlock` | `requireAnon` |
| `/signup` | `SignupBlock` | `requireAnon` |
| `/forgot-password` | `ForgotPasswordBlock` | `requireAnon` |
| `/verify` | `CodeAuthBlock` | none — has an account, no session yet |
| `/reset-password` | composed locally | none — arrives *signed in* via the recovery link |
| `/logout` | — | action-only, `POST` |
| `/terms` | — | public; linked from the signup consent checkbox |

`/terms` opens in a new tab rather than navigating, so reading it does not
discard a half-filled signup form. Its body is a **working draft**, marked as
such on the page itself, and needs real reviewed wording before public sign-ups.

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

## Stand-in behaviour (remove when Supabase lands)

The session is a localStorage record under `corpora.auth.session`.

| | |
| --- | --- |
| Any email + password | signs in |
| `locked@corpora.local` | always fails, so the error shake is demoable |
| Signup | never returns a session — hands off to `/verify` |
| `/verify` code | `123456` |

## When you wire Supabase up

Replace the bodies in `app/lib/auth.ts` with `supabase.auth.*`. Beyond that,
three things need attention that no test here can catch:

- **RLS.** Signing in flips the Postgres role from `anon` to `authenticated`.
  Four tables — `projects`, `corpora`, `project_corpora`, `project_references` —
  carry `for all to anon` policies (`supabase/migrations/20260719000000_project_workspace.sql`).
  Those stop applying to a signed-in user, and RLS denial returns **zero rows,
  not an error**, so every list page would silently empty. The remaining tables
  use role-less policies, which cover both. Verify against the live project
  before assuming the local migrations are current — they have drifted before.
- **Redirect allowlist.** OAuth and emailed links need their callback URL added
  under Authentication → URL Configuration.
- **The `/verify` code screen** only works if the "Confirm signup" email
  template sends `{{ .Token }}`. The default template sends a link instead, in
  which case that route needs a callback route rather than a code field.

## Known upstream quirk

`CodeAuthBlock` keys its OTP wrapper on the error message, so after a rejected
code the first keystroke clears the error, remounts the field and drops the rest
of the typed code — the user has to click back into it. Worth fixing in
`../corpora-ui`; nothing this app does can work around it.

# Connect Google OAuth to corpora-web

> Implementation prompt authored 2026-08-02, grounded in the `@exegia` auth packages
> published that day. Paste into a fresh session (branch `feat/connect-google-auth`),
> or follow it by hand.

## Goal

Add "Sign in with Google" to corpora-web (React Router 7 client-only SPA, bun, Supabase
project `ivaecofevxactmmupvyp` in the `exegia` org) using the auth packages published
2026-08-02: `@exegia/use-auth@0.9.0` and `@exegia/plugin-supabase-auth@0.9.0` (pin both
exactly; commit the lockfile). Read `docs/auth.md` and the existing supabase client setup
(`getSupabase()` in `app/lib/auth.ts`, plus the `/auth/callback` route) before writing any
code.

## Credentials I may need to provide — ask me, don't guess

Enabling the Google provider requires a **Google OAuth Client ID and Client Secret** from
Google Cloud Console (APIs & Services → Credentials → OAuth 2.0 Client ID, type "Web
application"). If you cannot find them already configured on the Supabase project, STOP
and ask me for them — do not invent placeholders or leave the provider half-configured.
When I create the Google client, its **Authorized redirect URI** must be
`https://ivaecofevxactmmupvyp.supabase.co/auth/v1/callback`.

## Supabase side — use the Supabase MCP and current docs, not memory

- Use MCP `search_docs` (or fetch
  `https://supabase.com/docs/guides/auth/social-login/auth-google.md`) for the current
  Google-provider setup steps; Supabase changes often, so trust docs over training data.
- Use MCP tools (`get_project`, `get_project_url`, `get_publishable_keys`, `get_logs`,
  `get_advisors`) for project facts and post-change verification. If provider enablement
  isn't reachable via MCP, walk me through the dashboard (Authentication → Sign In /
  Providers → Google) and verify afterwards.
- Check **Authentication → URL Configuration**: Site URL plus Redirect URLs for local dev
  and the Vercel production domain. Known gotcha from a previous session: the Redirect
  URLs card once silently failed to save — re-read the values after saving to confirm
  they persisted.

## App side — how the new package works (v0.9.0 facts, verify against its README)

- At web-app startup, before any hook/binding runs:
  `import { configureWeb } from "@exegia/plugin-supabase-auth/web"` and call
  `configureWeb({ client: getSupabase().auth })` so the bindings share the app's existing
  supabase-js client and session state. Anything called earlier rejects
  `{ kind: "configuration" }`.
- Hooks come from `@exegia/use-auth` (import the package root only). Google sign-in is
  `authActions.signInWithOAuth({ provider: "google" })` /
  `useAuth().signInWithOAuth(...)`.
- **Redirect-flow semantics:** on web the page navigates away, so the returned promise
  may never settle in the current document — do not gate a spinner on it settling. The
  session lands on the `/auth/callback` route via the client's `detectSessionInUrl`;
  make sure the existing callback route and route guards handle the OAuth return path,
  and that errors surface via `isAuthError` kinds (`oauthFlowInterrupted`,
  `configuration`) with user-facing strings from the UI kit patterns.
- Follow the repo's conventions: `clientLoader`/`clientAction` only, deferred-loader
  contract in `docs/data-loading.md`, auth guard patterns in `docs/auth.md`. Don't
  reshape any detail loader's `loaderData` (breadcrumb contract).

## Verify before calling it done

1. `bun run typecheck`, `bun run test`, `bun run lint` (ignore the ~25 pre-existing
   `only-export-components` warnings).
2. Real browser round-trip: click Google sign-in → Google consent → land back signed in →
   projects load under RLS → sign out. Check MCP `get_logs` (auth) if the round-trip
   fails.
3. Confirm the existing email/password flow still works (Google may auto-link to an
   existing confirmed account with the same email — check current docs for the linking
   behavior and tell me what applies before enabling in production).

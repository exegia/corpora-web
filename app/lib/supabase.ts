import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

let client: SupabaseClient<Database> | null = null

/** The prefix dotenvx leaves on any value it did not decrypt. */
const CIPHERTEXT_PREFIX = "encrypted:"

/**
 * PostgREST rejects access tokens whose `iat` is even slightly ahead of its
 * own clock with this exact message. It commonly hits the *first* authenticated
 * query after a tab reopen / cold start (a just-refreshed token races a skewed
 * validator), and clears once the server clock catches up to the token's `iat`.
 */
export const JWT_ISSUED_AT_FUTURE = "JWT issued at future"

/**
 * How many times a skewed-`iat` 401 is refreshed-and-replayed, and how long to
 * wait before each replay. The refreshed token is stamped with the same client
 * clock that caused the skew, so the replay has to give the server clock a
 * moment to accept it — an instant retry loses the race every time. Bounded so
 * a session that is broken for some other reason still surfaces.
 */
const MAX_SKEW_RETRIES = 3
const SKEW_RETRY_DELAY_MS = 400

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * A value that is set but unusable is worse than a missing one: it sails past
 * a truthiness check and surfaces later as an opaque library error during
 * render. The commonest cause is a build that skipped dotenvx and fell back to
 * the committed, still-encrypted `.env`.
 */
function assertDecrypted(name: string, value: string): void {
  if (value.startsWith(CIPHERTEXT_PREFIX)) {
    throw new Error(
      `${name} is still dotenvx ciphertext — the build ran without dotenvx and fell back to the committed .env. Set ${name} in the deployment environment (see .env.example).`,
    )
  }
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input
  if (input instanceof URL) return input.href
  return input.url
}

/** GoTrue lives under `/auth/v1/`; never intercept those (including refresh). */
function isAuthEndpoint(input: RequestInfo | URL): boolean {
  return requestUrl(input).includes("/auth/v1/")
}

/**
 * Wrap `fetch` so a transient "JWT issued at future" from PostgREST triggers
 * a session refresh and a replay, instead of failing the whole route.
 *
 * Narrow on purpose: other 401s (expired session, revoked user, bad key) must
 * still surface. Concurrent failures share a single in-flight refresh. Auth
 * endpoints are never intercepted so `refreshSession` cannot recurse through
 * this wrapper. The replay backs off briefly and is bounded, because the
 * refreshed token carries the same client clock that caused the skew — an
 * instant retry loses that race.
 *
 * @internal exported for unit tests
 */
export function createSkewTolerantFetch(
  refreshAccessToken: () => Promise<string | null>,
): typeof fetch {
  let refreshInFlight: Promise<string | null> | null = null

  const singleFlightRefresh = (): Promise<string | null> => {
    if (!refreshInFlight) {
      refreshInFlight = refreshAccessToken().finally(() => {
        refreshInFlight = null
      })
    }
    return refreshInFlight
  }

  return async (input, init) => attempt(input, init, 0)

  async function attempt(
    input: RequestInfo | URL,
    init: RequestInit | undefined,
    retriesUsed: number,
  ): Promise<Response> {
    const response = await fetch(input, init)
    if (response.status !== 401 || isAuthEndpoint(input)) {
      return response
    }

    let body = ""
    try {
      body = await response.clone().text()
    } catch {
      return response
    }
    if (!body.includes(JWT_ISSUED_AT_FUTURE)) return response

    // The refreshed token is minted with the same client clock that caused the
    // skew, so an instant replay fails the same way. The server clock only
    // needs a moment to accept the token's `iat` — back off briefly and retry,
    // bounded so a genuinely broken session still surfaces.
    if (retriesUsed >= MAX_SKEW_RETRIES) return response

    const token = await singleFlightRefresh()
    if (!token) return response

    await sleep(SKEW_RETRY_DELAY_MS)
    return attempt(input, withBearer(input, init, token), retriesUsed + 1)
  }
}

/** Rebuild request init with a fresh Authorization bearer. */
function withBearer(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  accessToken: string,
): RequestInit {
  // Prefer headers from init; fall back to a Request object's headers so we
  // do not drop apikey / Prefer / Content-Profile that supabase-js set there.
  const headers = new Headers(
    init?.headers ?? (input instanceof Request ? input.headers : undefined),
  )
  headers.set("Authorization", `Bearer ${accessToken}`)
  return { ...init, headers }
}

/**
 * Lazily created singleton so importing this module never throws — the env
 * check runs on first use (and is bypassed entirely when tests mock this
 * module).
 */
export function getSupabase(): SupabaseClient<Database> {
  if (client) return client

  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (see .env.example)",
    )
  }

  assertDecrypted("VITE_SUPABASE_URL", url)
  assertDecrypted("VITE_SUPABASE_PUBLISHABLE_KEY", key)

  // Checked here rather than left to createClient, so a misconfigured
  // deployment names the variable at fault instead of reporting
  // "Invalid supabaseUrl" from inside the library.
  let protocol: string
  try {
    protocol = new URL(url).protocol
  } catch {
    throw new Error(
      `VITE_SUPABASE_URL is not a valid URL: ${JSON.stringify(url.slice(0, 40))} (see .env.example)`,
    )
  }
  if (protocol !== "https:" && protocol !== "http:") {
    throw new Error(
      `VITE_SUPABASE_URL must be an http(s) URL, got ${JSON.stringify(protocol)} (see .env.example)`,
    )
  }

  // Client is assigned before any request can run; the refresh callback closes
  // over `client` and only runs after the first 401, so the non-null assertion
  // is safe.
  client = createClient<Database>(url, key, {
    global: {
      fetch: createSkewTolerantFetch(async () => {
        const { data, error } = await client!.auth.refreshSession()
        if (error || !data.session?.access_token) return null
        return data.session.access_token
      }),
    },
  })
  return client
}

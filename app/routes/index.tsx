import { redirect } from "react-router"
import { DEFAULT_AUTHENTICATED_PATH, requireSession } from "@/lib/auth"
import type { Route } from "./+types/index"

/**
 * `/` is a pure dispatcher: a signed-in user lands on the dashboard, everyone
 * else on the login screen. It goes through `requireSession` rather than a
 * bare session check because a failed OAuth round-trip returns the browser
 * to the Site URL — this route — with the reason in the URL; the guard hands
 * that to /auth/callback instead of silently bouncing to /login.
 */
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  await requireSession(request)
  throw redirect(DEFAULT_AUTHENTICATED_PATH)
}

export default function Index() {
  return null
}

import { AppLayout } from "@/components/layouts/app-layout"
import { requireSession } from "@/lib/auth"
import type { Route } from "./+types/protected-layout"

/**
 * Guard + chrome for every authenticated route.
 *
 * `requireSession` throws a redirect to `/login?redirectTo=…` before any child
 * loader runs, so no protected route module ever repeats the check.
 *
 * The shape returned here is intentionally minimal: `app/components/breadcrumb`
 * scans every match's `loaderData` for `project` / `licence` keys, so a layout
 * loader must not introduce either (see docs/data-loading.md).
 */
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const user = await requireSession(request)
  return { user }
}

export default function ProtectedLayout({ loaderData }: Route.ComponentProps) {
  return <AppLayout user={loaderData.user} />
}

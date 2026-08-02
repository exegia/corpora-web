import { redirect } from "react-router"
import { LOGIN_PATH, signOut } from "@/lib/auth"

/**
 * Action-only route. Sign-out is a mutation, so it is posted to rather than
 * navigated to — that keeps a prefetch or a stray link from ending a session.
 */
export async function clientAction() {
  await signOut()
  return redirect(LOGIN_PATH)
}

export async function clientLoader() {
  return redirect(LOGIN_PATH)
}

export default function Logout() {
  return null
}

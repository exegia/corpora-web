/** Paths served by the auth layout — never a valid post-login destination. */
export const AUTH_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify",
  "/auth/callback",
] as const

export const LOGIN_PATH = "/login"
export const DEFAULT_AUTHENTICATED_PATH = "/"

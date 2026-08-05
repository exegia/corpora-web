import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router"
import { AnchoredToastProvider, ToastProvider } from "@/components/ui/toast"
import type { Route } from "./+types/root"
import { THEME_INIT_SCRIPT } from "@/lib/theme"
import "./app.css"

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <title>Corpora</title>
        {/* Applies the theme before first paint to avoid a light flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <Meta />
        <Links />
      </head>
      <body className="w-full h-screen relative overflow-hidden">
        <ToastProvider position="top-right">
          <AnchoredToastProvider>
            <div className="absolute left-0 top-0 w-full h-full overflow-hidden scrollbar-none">
              {children}
              <ScrollRestoration />
            </div>
          </AnchoredToastProvider>
        </ToastProvider>
        <Scripts />
      </body>
    </html>
  )
}

// The chrome moved down a level: `routes/protected-layout` renders the sidebar
// shell, `routes/auth-layout` renders the signed-out one. Root just hosts them.
export default function App() {
  return <Outlet />
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!"
  let details = "An unexpected error occurred."

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error"
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message
  }

  return (
    <main className="mx-auto max-w-lg p-8 text-center">
      <h1 className="font-heading text-3xl font-bold">{message}</h1>
      <p className="text-muted-foreground mt-2">{details}</p>
    </main>
  )
}

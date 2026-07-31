import { ArrowLeft } from "lucide-react"
import { Link } from "react-router"
import { SoundToggle } from "@/components/sound-toggle"
import { ThemeToggle } from "@/components/theme-toggle"

/** Last substantive revision. Shown so a reader can tell what they agreed to. */
const UPDATED = "30 July 2026"

/**
 * Terms of use, linked from the signup form's consent checkbox.
 *
 * Unguarded and outside both layouts: it has to be readable before an account
 * exists, and the sidebar chrome would be noise around a reading column.
 *
 * The copy below is a working draft, not reviewed text — see the notice at the
 * top of the page, which stays until a lawyer replaces the body.
 */
export default function Terms() {
  return (
    <div className="min-h-screen w-full">
      <header className="mx-auto flex max-w-2xl items-center gap-2 px-6 pt-6">
        <Link
          to="/signup"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to sign up
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <SoundToggle />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 pt-8 pb-16">
        <h1 className="font-heading text-3xl font-bold">Terms of use</h1>
        <p className="text-muted-foreground mt-2 text-sm">Last updated {UPDATED}</p>

        <p className="border-muted-foreground/32 bg-muted/40 text-muted-foreground mt-6 rounded-lg border border-dashed p-4 text-sm">
          <span className="text-foreground font-medium">Draft.</span> This page
          is a working outline of the terms, not reviewed legal text. It is here
          so the signup consent links somewhere real; the wording still needs to
          be settled before Corpora accepts public sign-ups.
        </p>

        <div className="licence-prose mt-8">
          <h2>1. What Corpora is</h2>
          <p>
            Corpora is a workspace for assembling, licensing and publishing
            manuscript corpora. Creating an account gives you access to the
            projects, corpora and reference material you or your organisation
            own, and to material others have published openly.
          </p>

          <h2>2. Your account</h2>
          <p>
            You are responsible for keeping your credentials secure and for
            everything done through your account. Tell us promptly if you think
            someone else has access to it. Accounts are for people, not shared
            logins — an organisation with several researchers needs an account
            for each of them.
          </p>

          <h2>3. Material you upload</h2>
          <p>
            You keep ownership of everything you upload. You are responsible for
            having the right to upload it and for attaching a licence that
            accurately reflects the terms it came to you under. Uploading a
            manuscript, transcription or translation you do not hold the rights
            to is not permitted.
          </p>
          <p>
            When you publish a project, the corpus and the licence you attached
            become visible to other Corpora users under the terms of that
            licence.
          </p>

          <h2>4. Material others publish</h2>
          <p>
            Published corpora carry their own licences, and those licences govern
            what you may do with them. A licence shown in Corpora is the one the
            publisher attached; we do not independently verify it.
          </p>

          <h2>5. Acceptable use</h2>
          <p>
            Do not use Corpora to distribute material you have no right to
            distribute, to attempt to reach data belonging to others, or to
            interfere with the service. We may suspend an account that does.
          </p>

          <h2>6. Availability and changes</h2>
          <p>
            Corpora is under active development. Features may change, and the
            service may be unavailable at times. We will give notice before a
            change that would remove access to material you have stored.
          </p>

          <h2>7. Ending your account</h2>
          <p>
            You can close your account at any time. Published corpora that others
            already rely on may remain available under the licence you attached;
            unpublished material is removed.
          </p>

          <h2>8. Changes to these terms</h2>
          <p>
            If these terms change materially, we will say so before the change
            takes effect. The date at the top of this page always reflects the
            most recent revision.
          </p>

          <h2>9. Getting in touch</h2>
          <p>
            Questions about these terms can go to the project maintainers through
            the contact route listed in the repository.
          </p>
        </div>
      </main>
    </div>
  )
}

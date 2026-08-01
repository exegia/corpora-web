# Branching and release

Two long-lived things: `main` and the tags. Everything else is temporary.

```
feat/add-tooltip ──PR──> release/v0.4.0 ──PR──> main ──> Vercel prod + tag v0.4.0
      (deleted on merge)   (deleted on release)          (opens release/v0.5.0)
```

Same model as [corpora-ui](https://github.com/exegia/corpora-ui), with one
difference: this repo is private and ships as a **deployment**, not a package.
Where corpora-ui publishes to npm, `main` here deploys to Vercel production.

## Feature branches

Named `<type>/<slug>` — `feat`, `fix`, `chore`, `docs`, `ci`, `refactor`,
`test`, `perf`, `build`, `style`, `revert`. (Git forbids `:` in a ref name, so
the conventional-commit form lives in the **PR title**: `feat: add tooltip`.)

Branch off the open release branch and open a PR back into it. While the PR is
a draft only the guard runs; marking it **ready for review** starts the tests
and the AI review, which then re-run on every push.

When it merges the branch deletes itself, the release's draft PR into `main`
is opened or refreshed with a changelog of everything on the branch so far, and
the release branch's Vercel preview redeploys.

## Release branches

Named `release/vX.Y.Z`, and always carry that version in `package.json` — the
guard rejects a PR into `main` where the two disagree.

Exactly one is open at a time. It is cut automatically after each release, and
its draft PR into `main` accumulates changes as features land. Marking that PR
ready for review runs the tests plus a real production build, uploaded as an
artifact — if `build/client` cannot be produced there, the release deploy would
have failed after the merge, on protected `main`.

Every push to the branch refreshes one rolling preview deployment, so there is
always a live URL for what is queued for the next release.

## `main`

No direct pushes; PRs only from `release/vX.Y.Z`. Merging one deploys to Vercel
production, creates the `vX.Y.Z` tag and GitHub Release, deletes the release
branch and opens the next one (minor bump by default).

## Workflows

| File                  | Trigger                     | Does                                       |
|-----------------------|-----------------------------|--------------------------------------------|
| `pr.yml`              | PR opened / ready / pushed  | `guard`, `check`, `package`, `review`      |
| `pr-merged.yml`       | PR merged into `release/v*` | deletes the branch, upserts the release PR |
| `release-preview.yml` | push to `release/v*`        | rolling Vercel preview deploy              |
| `release.yml`         | PR merged into `main`       | deploys, tags, cuts the next release       |

Every step is a `make` target, so anything CI does can be reproduced locally.

The production deploy lives inside `release.yml` rather than hanging off the
GitHub Release. `make tag-release` creates that Release with `GITHUB_TOKEN`,
and events raised by `GITHUB_TOKEN` do not start new workflow runs — a
`release: [published]` trigger would sit there and never fire.

## Bootstrap and manual operations

There is no release branch to start from on a fresh repo. Run the **Release**
workflow manually (`Actions → Release → Run workflow`, pick a bump) — the
deploy job skips and the next-release job opens the branch. Locally:

```bash
make release-branch BUMP=minor
```

There are no tags yet, so the first release branch is `release/v0.1.0`.

Other useful targets:

```bash
make ci                            # what CI runs on a PR
make next-version BUMP=patch       # what the next release would be called
make release-notes RANGE=origin/main..HEAD
make rulesets-diff                 # rulesets GitHub actually has
make rulesets-apply                # push .github/rulesets/*.json
```

`make tag-release` is idempotent — a tag already released is skipped, not an
error. `make rulesets-apply` matches by `.name`, so the file must keep the name
of the ruleset already on GitHub (`Protect main branch`) or a second one is
created alongside it.

## Secrets

| Name                                               | Where            | Used by                    |
|----------------------------------------------------|------------------|----------------------------|
| `VERCEL_TOKEN`                                     | `production` env | `release.yml` deploy       |
| `VERCEL_TOKEN`                                     | `preview` env    | `release-preview.yml`      |
| `AUTOMATION_APP_ID` / `AUTOMATION_APP_PRIVATE_KEY` | repository       | opening PRs and branches   |
| `CLAUDE_CODE_OAUTH_TOKEN`                          | repository       | the AI review (optional)   |

`VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are repository **variables**, not
secrets.

Without `CLAUDE_CODE_OAUTH_TOKEN` the review job skips with a note in the job
summary rather than failing; the same is true of the preview deploy without
`VERCEL_TOKEN`. The automation App is **not** optional — `pr-merged.yml` and
the `next-release` job both fail at their first step without it. A PR opened
with `GITHUB_TOKEN` cannot trigger further workflows, so the release PR's own
checks would never start.

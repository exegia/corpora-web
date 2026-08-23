# Branching and release

Two long-lived integration lanes (`dev`, `next`) plus `main` and the tags.
Release branches are temporary and versioned.

```
<type>/<slug> ──PR──> dev ──(daily/manual)──> next ──cut──> release/vX.Y.Z ──draft PR──> main
                 (deleted on merge)         (preview)                       (deleted on release)
```

Same model as [corpora-ui](https://github.com/exegia/corpora-ui) used to share,
except this repo is private and ships as a **deployment**, not a package.
Where corpora-ui publishes to npm, `main` here deploys to Vercel production.

## Feature branches

Named `<type>/<slug>` — `feat`, `fix`, `chore`, `docs`, `ci`, `refactor`,
`test`, `perf`, `build`, `style`, `revert`. (Git forbids `:` in a ref name, so
the conventional-commit form lives in the **PR title**: `feat: add tooltip`.)

Branch off `dev` and open a PR back into it. While the PR is a draft only the
guard runs; marking it **ready for review** starts the tests and the AI review,
which then re-run on every push.

When it merges the branch deletes itself (repository setting) and `dev` moves
forward. Nothing is versioned yet.

## `dev` and `next`

`dev` is the working branch. Features land here all day.

`next` is staging. A scheduled workflow (22:00 UTC daily) and a manual
**Promote to next** action open a PR from `dev` into `next` when `dev` is
ahead. That PR auto-merges once `guard` and `check` pass. Every push to `next`
refreshes one rolling Vercel preview.

## Versioning

The promote job classifies the bump from line-count churn
(`git diff --shortstat origin/next...origin/dev`, insertions + deletions):

| Churn | Makefile bump | Semver | Your label |
|-------|---------------|--------|------------|
| `< 100` | `patch` | `0.0.+1` | minor |
| `100–999` | `minor` | `0.+1.0` | major |
| `≥ 1000` | `major` | `+1.0.0` | breaking |

`workflow_dispatch` can override with `major` / `minor` / `patch`. The chosen
version is stored on the promote PR as `<!-- corpora-release: vX.Y.Z -->` so
the cut still knows it after `dev` and `next` are equal.

## Release branches

Named `release/vX.Y.Z`, and always carry that version in `package.json` — the
guard rejects a PR into `main` where the two disagree.

A push to `next` cuts (or refreshes) the branch from `next` plus a
`chore(release): open vX.Y.Z` commit. Exactly one is in flight at a time: if a
draft PR into `main` is already open, later promotions fast-forward that same
branch and **keep its version**.

Last-minute fixes can still PR `<type>/<slug>` directly into that in-flight
`release/v*` (same guard/check/review as `dev`). A push refreshes the draft
into `main`.

The draft PR into `main` accumulates the changelog of everything on the branch.
Marking it ready for review runs the tests plus a real production build,
uploaded as an artifact — if `build/client` cannot be produced there, the
release deploy would have failed after the merge, on protected `main`.

## `main`

No direct pushes; PRs only from `release/vX.Y.Z`. Merging one deploys to Vercel
production, creates the `vX.Y.Z` tag and GitHub Release, deletes the release
branch, then opens PRs that merge `main` back into `next` and `dev` and deletes
leftover remote feature / `release/v*` heads.

It does **not** cut the next release branch. That waits for the next promote.

## Workflows

| File             | Trigger                         | Does                                                |
|------------------|---------------------------------|-----------------------------------------------------|
| `pr.yml`         | PR opened / ready / pushed      | `guard`, `check`, `package` (into main), `review` (into `dev`) |
| `promote.yml`    | 22:00 UTC daily / manual        | bootstrap lanes, open `dev` → `next` PR, auto-merge |
| `next.yml`       | push to `next`                  | rolling Vercel preview, cut/refresh `release/v*`    |
| `pr-merged.yml`  | push to `release/v*`            | upsert the draft release PR into `main`             |
| `release.yml`    | PR merged into `main`           | deploy, tag, sync lanes, cleanup                    |

Every step is a `make` target, so anything CI does can be reproduced locally.

The production deploy lives inside `release.yml` rather than hanging off the
GitHub Release. `make tag-release` creates that Release with `GITHUB_TOKEN`,
and events raised by `GITHUB_TOKEN` do not start new workflow runs — a
`release: [published]` trigger would sit there and never fire.

Scheduled workflows are read from the **default branch**. `promote.yml` will
not fire on a cron until this file has shipped to `main`.

## Bootstrap and manual operations

There are no `dev` / `next` branches on a fresh repo (or on this repo until
the first bootstrap). Run the **Release** workflow manually
(`Actions → Release → Run workflow`) — the deploy job skips and wrapup creates
the lanes. Locally:

```bash
make bootstrap-lanes
```

`dev` is created from the newest `release/v*` if one exists, otherwise `main`.
`next` is created from `main`. Then run **Promote to next** (or wait until
22:00 UTC) once there is work on `dev`.

Other useful targets:

```bash
make ci                            # what CI runs on a PR
make churn-info FROM=origin/next TO=origin/dev
make next-version BUMP=patch       # what the next tag would be called
make release-notes RANGE=origin/main..HEAD
make cleanup-local                 # prune local feature / release branches
make rulesets-diff                 # rulesets GitHub actually has
make rulesets-apply                # push .github/rulesets/*.json
```

`make tag-release` is idempotent — a tag already released is skipped, not an
error. `make rulesets-apply` matches by `.name`, so the file must keep the name
of the ruleset already on GitHub (`Protect main branch`, `Protect dev branch`,
`Protect next branch`) or a second one is created alongside it.

Enable **Allow auto-merge** on the repository. Promote and post-release sync
PRs use `gh pr merge --auto`.

## Secrets

| Name                                               | Where            | Used by                    |
|----------------------------------------------------|------------------|----------------------------|
| `VERCEL_TOKEN`                                     | `production` env | `release.yml` deploy       |
| `VERCEL_TOKEN`                                     | `preview` env    | `next.yml` preview         |
| `AUTOMATION_APP_ID` / `AUTOMATION_APP_PRIVATE_KEY` | repository       | opening PRs and branches   |
| `CLAUDE_CODE_OAUTH_TOKEN`                          | repository       | the AI review (optional)   |

`VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are repository **variables**, not
secrets.

Without `CLAUDE_CODE_OAUTH_TOKEN` the review job skips with a note in the job
summary rather than failing; the same is true of the preview deploy without
`VERCEL_TOKEN`. The automation App is **not** optional — `promote.yml`,
`next.yml`, `pr-merged.yml` and the `wrapup` job all fail at their first step
without it. A PR opened with `GITHUB_TOKEN` cannot trigger further workflows,
so the release PR's own checks would never start.

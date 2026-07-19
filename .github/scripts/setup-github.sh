#!/usr/bin/env bash
# One-shot GitHub bootstrap for corpora-web.
#
# Usage:
#   .github/scripts/setup-github.sh [owner/repo]        # default: exegia/corpora-web
#
# Optional env vars:
#   VISIBILITY=public|private                            # default: private
#   VERCEL_ORG_ID / VERCEL_PROJECT_ID                    # from .vercel/project.json after `vercel link`
#   VERCEL_TOKEN                                         # set as secret on preview + production envs
#   MAIN_BYPASS_ACTORS_JSON                              # extra bypass actors for the main ruleset
#
# Requires: gh (authenticated), git, jq.

set -euo pipefail

repo="${1:-exegia/corpora-web}"
visibility="${VISIBILITY:-private}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/../.." && pwd)"

command -v gh >/dev/null || { echo "gh CLI is required: https://cli.github.com"; exit 1; }
command -v jq >/dev/null || { echo "jq is required"; exit 1; }
gh auth status >/dev/null

cd "${repo_root}"

# 1. Create the repository if it doesn't exist
if gh repo view "${repo}" >/dev/null 2>&1; then
  echo "Repository ${repo} already exists."
else
  gh repo create "${repo}" "--${visibility}"
  echo "Created ${repo} (${visibility})."
fi

# 2. Push main
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "https://github.com/${repo}.git"
else
  git remote add origin "https://github.com/${repo}.git"
fi
git push -u origin main
echo "Pushed main."

# 3. Create dev + next from main, set dev as default, apply protections + rulesets
"${script_dir}/apply-branch-guardrails.sh" "${repo}"

# 4. Deployment environments
for env in preview production; do
  gh api -X PUT "repos/${repo}/environments/${env}" >/dev/null
  echo "Ensured environment: ${env}"
done

# 5. Vercel wiring (optional — skipped when env vars are absent)
if [[ -n "${VERCEL_ORG_ID:-}" ]]; then
  gh variable set VERCEL_ORG_ID --repo "${repo}" --body "${VERCEL_ORG_ID}"
  echo "Set repo variable VERCEL_ORG_ID."
fi
if [[ -n "${VERCEL_PROJECT_ID:-}" ]]; then
  gh variable set VERCEL_PROJECT_ID --repo "${repo}" --body "${VERCEL_PROJECT_ID}"
  echo "Set repo variable VERCEL_PROJECT_ID."
fi
if [[ -n "${VERCEL_TOKEN:-}" ]]; then
  for env in preview production; do
    gh secret set VERCEL_TOKEN --repo "${repo}" --env "${env}" --body "${VERCEL_TOKEN}"
    echo "Set VERCEL_TOKEN secret on ${env}."
  done
fi

echo
echo "Done. Remaining manual steps (if skipped above):"
echo "  1. bunx vercel link   → creates .vercel/project.json with orgId/projectId"
echo "  2. Re-run with VERCEL_ORG_ID/VERCEL_PROJECT_ID/VERCEL_TOKEN set, or add them"
echo "     in GitHub → Settings → Secrets and variables → Actions."
echo "  3. Work flows: feature/* → PR to dev → RC tag · dev → next PR → preview deploy"
echo "     → auto release PR next → main → merge → vX.Y.Z tag + release → production deploy."

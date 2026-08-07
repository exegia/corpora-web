# corpora-web — task runner for the app and the release pipeline.
# Usage: make <target>   (run from the repo root)
#
# CI calls these targets directly; every workflow step is a one-line `make`.
# Ported from corpora-ui, with npm publishing replaced by a Vercel deploy —
# this app is private and ships as a deployment, not a package.

BUN := bun

# `--frozen-lockfile` in CI, a plain install locally.
INSTALL_FLAGS ?=

# Bump used when opening the next release branch.
BUMP ?= minor

# Commit range for `release-notes`.
RANGE ?= origin/main..HEAD

# owner/name. The workflows set this from ${{ github.repository }}; otherwise it
# is derived from the origin remote. `gh` reads this variable natively too.
# (sed uses `,` as its delimiter: a `#` would open a comment, even inside $(shell).)
GH_REPO ?= $(shell git config --get remote.origin.url 2>/dev/null | sed -E 's,.*github\.com[:/],,; s,\.git$$,,')

# Branch and commit-title types accepted by `pr-guard`.
TYPES := feat|fix|chore|docs|ci|refactor|test|perf|build|style|revert

# What `vercel build` writes, and what the `package` job uploads.
BUILD_DIR := build

pkg_version = node -p "require('./package.json').version"

.DEFAULT_GOAL := help

.PHONY: help install serve build preview test typecheck lint check ci pack \
        clean distclean pkg-version next-version version-set release-notes \
        pr-guard release-pr release-branch delete-branch deploy deploy-preview \
        tag-release rulesets-apply rulesets-diff

help: ## List available targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

# --- development ------------------------------------------------------------

install: ## Install dependencies
	$(BUN) install $(INSTALL_FLAGS)

dev: ## Start the React Router dev server
	$(BUN) run dev:local

build: ## Build for production
	$(BUN) run build

preview: ## Serve the production build locally
	$(BUN) run preview

test: ## Run the vitest suite
	$(BUN) run test

typecheck: ## Generate route types, then type-check
	$(BUN) run typecheck

lint: ## Run oxlint
	$(BUN) run lint

check: typecheck lint ## Typecheck + lint

ci: install check test build ## Everything CI runs on a pull request

clean: ## Remove build output and caches
	rm -rf $(BUILD_DIR) node_modules/.vite .react-router .vercel/output

distclean: clean ## Also remove node_modules
	rm -rf node_modules

# --- versions ---------------------------------------------------------------

pkg-version: ## Print the version in package.json
	@$(pkg_version)

next-version: ## Print the version after the newest vX.Y.Z tag (BUMP=major|minor|patch)
	@git tag -l 'v[0-9]*.[0-9]*.[0-9]*' | sed 's/^v//' \
	  | sort -t. -k1,1n -k2,2n -k3,3n | tail -1 \
	  | awk -F. -v b='$(BUMP)' \
	      'BEGIN { maj = 0; min = 0; pat = 0 } { maj = $$1; min = $$2; pat = $$3 } \
	       END { if (b == "major") printf "%d.0.0\n", maj + 1; \
	             else if (b == "patch") printf "%d.%d.%d\n", maj, min, pat + 1; \
	             else printf "%d.%d.0\n", maj, min + 1 }'

version-set: ## Write VERSION into package.json (env: VERSION)
	@set -eu; : "$${VERSION:?VERSION is required}"; \
	npm pkg set version="$$VERSION"; \
	echo "package.json is now $$VERSION"

release-notes: ## Print a markdown changelog for RANGE (default origin/main..HEAD)
	@git log --no-merges --reverse --pretty='- %s' $(RANGE) | grep . \
	  || echo '- _Nothing merged yet._'

# --- pull requests ----------------------------------------------------------

pr-guard: ## Validate a PR's base, branch name and title (env: BASE, HEAD, TITLE)
	@set -eu; \
	: "$${BASE:?BASE is required}" "$${HEAD:?HEAD is required}"; \
	case "$$BASE" in \
	main) \
	  echo "$$HEAD" | grep -Eq '^release/v[0-9]+\.[0-9]+\.[0-9]+$$' \
	    || { echo "::error::main only accepts PRs from release/vX.Y.Z (got '$$HEAD')"; exit 1; }; \
	  want="release/v$$($(pkg_version))"; \
	  [ "$$want" = "$$HEAD" ] \
	    || { echo "::error::package.json declares $$want but the branch is $$HEAD"; exit 1; }; \
	  ;; \
	release/v*) \
	  echo "$$HEAD" | grep -Eq '^($(TYPES))/[a-z0-9][a-z0-9._-]*$$' \
	    || { echo "::error::branch must be <type>/<slug> — one of $(TYPES) (got '$$HEAD')"; exit 1; }; \
	  printf '%s' "$${TITLE-}" | grep -Eq '^($(TYPES))(\([a-z0-9._/-]+\))?!?: .+' \
	    || { echo "::error::PR title must read '<type>: summary' (got '$${TITLE-}')"; exit 1; }; \
	  ;; \
	*) \
	  echo "::error::$$BASE is not a valid base — target main or release/vX.Y.Z"; exit 1;; \
	esac; \
	echo "guard passed: $$HEAD -> $$BASE"

release-pr: ## Open or refresh the draft release PR into main (env: BRANCH)
	@set -eu; \
	branch="$${BRANCH:-$$(git rev-parse --abbrev-ref HEAD)}"; \
	version="$${branch#release/v}"; \
	git fetch --quiet origin \
	  "main:refs/remotes/origin/main" "$$branch:refs/remotes/origin/$$branch"; \
	body="$$(mktemp)"; \
	{ printf 'Release **v%s**.\n\n## Changes\n\n' "$$version"; \
	  $(MAKE) -s --no-print-directory release-notes RANGE="origin/main..origin/$$branch"; \
	  printf '\n---\nRefreshed automatically whenever a PR lands on `%s`.\n' "$$branch"; \
	} > "$$body"; \
	num="$$(gh pr list --base main --head "$$branch" --state open --json number --jq '.[0].number // empty')"; \
	if [ -n "$$num" ]; then \
	  gh pr edit "$$num" --body-file "$$body"; \
	  echo "refreshed release PR #$$num"; \
	else \
	  gh pr create --draft --base main --head "$$branch" \
	    --title "release: v$$version" --body-file "$$body"; \
	fi; \
	rm -f "$$body"

delete-branch: ## Delete a remote branch, tolerating one already gone (env: BRANCH)
	@set -eu; : "$${BRANCH:?BRANCH is required}"; \
	if gh api -X DELETE "repos/$(GH_REPO)/git/refs/heads/$$BRANCH" >/dev/null 2>&1; then \
	  echo "deleted $$BRANCH"; \
	else \
	  echo "$$BRANCH was already gone"; \
	fi

# --- releases ---------------------------------------------------------------

pack: install build ## Build the deployable output (the artifact CI uploads)
	@echo "built $(BUILD_DIR)/client"

# Vercel's own build, not `bun run build` — `vercel build` reads vercel.json and
# produces .vercel/output, which is what `--prebuilt` deploys. Running the build
# here rather than on Vercel is what keeps the deployed tree identical to the
# one CI just tested.
deploy: ## Build and deploy to Vercel production (env: VERCEL_TOKEN)
	@set -eu; : "$${VERCEL_TOKEN:?VERCEL_TOKEN is required}"; \
	bunx vercel pull --yes --environment=production --token="$$VERCEL_TOKEN"; \
	bunx vercel build --prod --token="$$VERCEL_TOKEN"; \
	url="$$(bunx vercel deploy --prebuilt --prod --token="$$VERCEL_TOKEN")"; \
	echo "production deployed: $$url"; \
	[ -n "$${GITHUB_STEP_SUMMARY-}" ] && echo "Production deployed: $$url" >> "$$GITHUB_STEP_SUMMARY" || true

deploy-preview: ## Build and deploy a Vercel preview (env: VERCEL_TOKEN)
	@set -eu; : "$${VERCEL_TOKEN:?VERCEL_TOKEN is required}"; \
	bunx vercel pull --yes --environment=preview --token="$$VERCEL_TOKEN"; \
	bunx vercel build --token="$$VERCEL_TOKEN"; \
	url="$$(bunx vercel deploy --prebuilt --token="$$VERCEL_TOKEN")"; \
	echo "preview deployed: $$url"; \
	[ -n "$${GITHUB_STEP_SUMMARY-}" ] && echo "Preview deployed: $$url" >> "$$GITHUB_STEP_SUMMARY" || true

tag-release: ## Tag HEAD as v<package version> and publish the GitHub Release
	@set -eu; \
	tag="v$$($(pkg_version))"; \
	if gh api "repos/$(GH_REPO)/git/ref/tags/$$tag" >/dev/null 2>&1; then \
	  echo "$$tag already exists — skipping"; exit 0; \
	fi; \
	gh release create "$$tag" --target "$$(git rev-parse HEAD)" \
	  --title "$$tag" --generate-notes; \
	echo "released $$tag"

release-branch: ## Cut release/v<next> from main with the version bumped (env: VERSION, BUMP)
	@set -eu; \
	git fetch --quiet --force --tags origin "main:refs/remotes/origin/main"; \
	version="$${VERSION:-$$($(MAKE) -s --no-print-directory next-version)}"; \
	branch="release/v$$version"; \
	if git ls-remote --exit-code --heads origin "$$branch" >/dev/null 2>&1; then \
	  echo "$$branch already exists — nothing to do"; exit 0; \
	fi; \
	git checkout --quiet -B "$$branch" origin/main; \
	$(MAKE) -s --no-print-directory version-set VERSION="$$version"; \
	git add package.json; \
	git commit --quiet -m "chore(release): open v$$version"; \
	git push --quiet -u origin "$$branch"; \
	echo "opened $$branch"

# --- repository settings ----------------------------------------------------

rulesets-diff: ## List the rulesets GitHub currently has, by id and name
	@gh api "repos/$(GH_REPO)/rulesets" --jq '.[] | "\(.id)\t\(.name)"'

rulesets-apply: ## Push .github/rulesets/*.json to GitHub (matched by name)
	@set -eu; \
	for f in .github/rulesets/*.json; do \
	  name="$$(node -p "require('./$$f').name")"; \
	  id="$$(gh api "repos/$(GH_REPO)/rulesets" --jq ".[] | select(.name==\"$$name\") | .id")"; \
	  if [ -n "$$id" ]; then \
	    gh api -X PUT "repos/$(GH_REPO)/rulesets/$$id" --input "$$f" >/dev/null; \
	    echo "updated $$name"; \
	  else \
	    gh api -X POST "repos/$(GH_REPO)/rulesets" --input "$$f" >/dev/null; \
	    echo "created $$name"; \
	  fi; \
	done

#!/usr/bin/env bash
# Push local commits to a remote branch through the GitHub API, so GitHub signs them.
#
#   scripts/api-push.sh <branch> [<local-ref>]      (env: GH_REPO, GH_TOKEN, FORCE)
#
# A `git push` from CI uploads the commits exactly as the runner made them: unsigned,
# which GitHub marks "Unverified" and Vercel refuses to deploy. Commits created through
# the REST git-data API by the automation App, with no author, committer or signature
# supplied, are signed by GitHub and verified.
#
# Every commit reachable from <local-ref> but not from an `origin/*` ref is recreated
# oldest first, merges included: changed blobs are uploaded, the tree is rebuilt on its
# first parent's tree, and the commit is created with the same message and (re-mapped)
# parents. Trees are content-addressed, so each rebuilt tree must hash to the local
# one; any difference stops the push before the branch moves. The branch ref is then
# created, or moved: fast-forward only unless FORCE=1.
#
# Bash 3.2 compatible (macOS): no associative arrays, no mapfile.
set -euo pipefail

branch="${1:?usage: scripts/api-push.sh <branch> [<local-ref>]}"
local_ref="${2:-HEAD}"
repo="${GH_REPO:?GH_REPO is required (owner/name)}"
force=false
case "${FORCE:-}" in 1 | true | yes) force=true ;; esac

tip="$(git rev-parse --verify "$local_ref^{commit}")"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/map"

# local commit sha -> sha of the API-created commit (unchanged when already remote)
mapped() { if [ -f "$work/map/$1" ]; then cat "$work/map/$1"; else printf '%s' "$1"; fi; }

remote_has_tree() { gh api "repos/$repo/git/trees/$1" --silent >/dev/null 2>&1; }

upload_blob() { # <sha>: create the blob remotely and check that it hashes the same
  local sha="$1" got
  git cat-file blob "$sha" | base64 | tr -d '\n' >"$work/blob.b64"
  got="$(jq -n --rawfile c "$work/blob.b64" '{content: $c, encoding: "base64"}' \
    | gh api "repos/$repo/git/blobs" --input - --jq .sha)"
  [ "$got" = "$sha" ] || { echo "::error::blob $sha uploaded as $got" >&2; exit 1; }
}

build_tree() { # <base-tree> <tree>: recreate <tree> remotely on top of <base-tree>
  local base="$1" tree="$2" got meta path omode nmode osha nsha status entries="$work/entries.ndjson"
  : >"$entries"
  git diff-tree -r -z --no-renames "$base" "$tree" >"$work/diff"
  while IFS= read -r -d '' meta && IFS= read -r -d '' path; do
    # meta: ":<old mode> <new mode> <old sha> <new sha> <status>"
    read -r omode nmode osha nsha status <<<"${meta#:}"
    case "$status" in
      D) jq -cn --arg p "$path" --arg m "$omode" \
           '{path: $p, mode: $m, type: (if $m == "160000" then "commit" else "blob" end), sha: null}' ;;
      *) if [ "$nmode" = 160000 ]; then
           jq -cn --arg p "$path" --arg s "$nsha" '{path: $p, mode: "160000", type: "commit", sha: $s}'
         else
           upload_blob "$nsha"
           jq -cn --arg p "$path" --arg m "$nmode" --arg s "$nsha" '{path: $p, mode: $m, type: "blob", sha: $s}'
         fi ;;
    esac >>"$entries"
    : "$osha"
  done <"$work/diff"
  got="$(jq -s --arg b "$base" '{base_tree: $b, tree: .}' "$entries" \
    | gh api "repos/$repo/git/trees" --input - --jq .sha)"
  [ "$got" = "$tree" ] || { echo "::error::tree $tree rebuilt as $got — not pushing" >&2; exit 1; }
}

count=0
for c in $(git rev-list --reverse --topo-order "$tip" --not --remotes=origin); do
  tree="$(git rev-parse "$c^{tree}")"
  parents=""
  for p in $(git rev-list --parents -n 1 "$c" | cut -d' ' -f2-); do
    parents="$parents $(mapped "$p")"
  done
  first="$(git rev-list --parents -n 1 "$c" | awk '{print $2}')"
  [ -n "$first" ] || { echo "::error::$c is a root commit; push it with git" >&2; exit 1; }
  if ! remote_has_tree "$tree"; then
    build_tree "$(git rev-parse "$first^{tree}")" "$tree"
  fi
  git log -1 --format=%B "$c" >"$work/msg"
  # shellcheck disable=SC2086 # word-split the parent list on purpose
  jq -n --rawfile m "$work/msg" --arg t "$tree" --args '{message: $m, tree: $t, parents: $ARGS.positional}' \
    $parents >"$work/commit.json"
  gh api "repos/$repo/git/commits" --input "$work/commit.json" \
    --jq '[.sha, (.verification.verified | tostring), .verification.reason] | join(" ")' >"$work/created"
  read -r new verified reason <"$work/created"
  [ "$verified" = true ] || echo "::warning::$new was created but is not verified ($reason)"
  printf '%s' "$new" >"$work/map/$c"
  echo "recreated $(git rev-parse --short "$c") as ${new:0:7} (verified=$verified)"
  count=$((count + 1))
done

target="$(mapped "$tip")"
if gh api "repos/$repo/git/ref/heads/$branch" --silent >/dev/null 2>&1; then
  jq -n --arg s "$target" --argjson f "$force" '{sha: $s, force: $f}' \
    | gh api -X PATCH "repos/$repo/git/refs/heads/$branch" --input - --silent
else
  jq -n --arg r "refs/heads/$branch" --arg s "$target" '{ref: $r, sha: $s}' \
    | gh api "repos/$repo/git/refs" --input - --silent
fi
git fetch --quiet --force origin "+refs/heads/$branch:refs/remotes/origin/$branch"
echo "$branch -> ${target:0:7} ($count commit(s) created through the API)"

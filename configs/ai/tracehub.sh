#!/usr/bin/env bash
# shellcheck shell=bash
#
# Checks tracehub's git hooks for my work checkouts.
#
#   config:tracehub setup | status
#
# The hooks themselves live in configs/git/assistant-ui.gitconfig, as hooks
# set in git config, so every assistant-ui repo, clone and worktree gets them
# with nothing written per checkout, Husky or not. That needs Git 2.54 or
# later; older git ignores them. Sign-in and the upload rule come from
# tracehub's own `setup`, run once by hand.
#
# No global hooks: tracehub refuses them with an [include] in ~/.gitconfig,
# and they'd reach repos outside work anyway.
#
# `setup` checks the sign-in and git, then removes the per-checkout hook
# blocks this script used to write (in each plain repo's .git/hooks, as
# untracked .husky/ files in Husky worktrees, and in ~/.config/husky/init.sh),
# so the hooks don't run twice. `status` shows what's set and what's left.
#
# Tracehub is always signed in as me, whichever account toggle:ai-github gives
# the agents: its sign-in is its own, not gh's or git's. A tracehub session
# belongs to the account that first uploaded it and refuses anyone else's
# appends, so uploads that followed the agents' account would strand every
# session whose commits got pushed by both.

set -uo pipefail

DIR="${PERSONAL_GITHUB_DIR:-$HOME/GitHub}/assistant-ui"
CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}"
HUSKY_INIT="$CONFIG/husky/init.sh"
HOOKS="prepare-commit-msg pre-push"
GITCONFIG="$(dirname "${BASH_SOURCE[0]}")/../git/assistant-ui.gitconfig"
MIN_GIT="2.54"

case "${1:-}" in
  setup|status) ;;
  *)
    printf 'usage: config:tracehub <setup|status>\n' >&2
    exit 64
    ;;
esac

# shellcheck source=github-personal.sh
. "$(dirname "${BASH_SOURCE[0]}")/github-personal.sh" || exit 1

say() {
  printf 'config:tracehub - %s\n' "$*"
}

die() {
  say "$*" >&2
  exit 1
}

# the tracehub version the gitconfig's hooks pin
VERSION="$(git config --file "$GITCONFIG" --get hook.tracehub-prepare-commit-msg.command | grep -o 'tracehub@[0-9][0-9.]*' | head -n 1)"
VERSION="${VERSION#tracehub@}"

# every assistant-ui checkout directly under $DIR, and the worktrees in .wt
checkouts() {
  local repo

  for repo in "$DIR"/*/ "$DIR"/.wt/*/
  do
    case "$(git -C "$repo" remote get-url origin 2>/dev/null | tr '[:upper:]' '[:lower:]')" in
      *github.com[:/]assistant-ui/*) printf '%s\n' "${repo%/}" ;;
    esac
  done
}

# Exits 0 when the git on PATH is at least $MIN_GIT.
git_new_enough() {
  local version
  version="$(git --version | awk '{print $3}')"
  [ "$(printf '%s\n%s\n' "$MIN_GIT" "$version" | sort -V | head -n 1)" = "$MIN_GIT" ]
}

# usage: legacy_files <checkout>
#
# The hook files that may still hold a block this script used to write: the
# shared .git/hooks of a plain repo, or the untracked .husky/<hook> files of a
# Husky worktree.
legacy_files() {
  local hook

  for hook in $HOOKS
  do
    case "$(git -C "$1" config --get core.hooksPath)" in
      "")
        printf '%s/%s\n' "$(git -C "$1" rev-parse --path-format=absolute --git-path hooks)" "$hook"
        ;;
      .husky/_)
        git -C "$1" ls-files --error-unmatch ".husky/$hook" >/dev/null 2>&1 || printf '%s/.husky/%s\n' "$1" "$hook"
        ;;
    esac
  done
}

# usage: has_block <file> <start marker>
has_block() {
  grep -Eq "^$2" "$1" 2>/dev/null
}

# usage: drop_block <file> <start marker> <end marker>
#
# Removes the block between the markers (extended regexes), and the file too
# when nothing but a shebang and blank lines is left.
drop_block() {
  local file=$1 rest

  has_block "$file" "$2" || return 0
  rest="$(awk -v start="^$2" -v end="^$3" '
    $0 ~ start { skip = 1; next }
    skip && $0 ~ end { skip = 0; next }
    !skip { print }
  ' "$file")"

  if ! printf '%s\n' "$rest" | grep -Evq '^(#!.*|[[:space:]]*)$'
  then
    rm -f "$file"
    say "removed $file"
  else
    printf '%s\n' "$rest" | cat -s > "$file"
    say "removed tracehub's block from $file"
  fi
}

# Stops unless tracehub is signed in as my own GitHub account.
check_login() {
  local me login
  me="$(personal_github_login)"
  login="$(jq -r '.login // empty' "$CONFIG/tracehub/auth.json" 2>/dev/null)"

  [ -n "$login" ] || die "not signed in to tracehub - run: npx --yes tracehub@$VERSION setup (sign in as ${me:-yourself}, allow assistant-ui, skip the hooks)"
  if [ -n "$me" ] && [ "$login" != "$me" ]
  then
    die "tracehub is signed in as $login, not $me - run: npx --yes tracehub@$VERSION setup, and sign in with your own account"
  fi
}

cmd_setup() {
  local repo file hook exclude

  [ -n "$VERSION" ] || die "no tracehub hooks in $GITCONFIG"
  check_login
  git_new_enough || die "$(command -v git) is $(git --version | awk '{print $3}'), and hooks set in config need $MIN_GIT or later - run: brew upgrade git"

  while IFS= read -r repo
  do
    while IFS= read -r file
    do
      [ -f "$file" ] || continue
      drop_block "$file" '# (tracehub|assisted-by):start' '# (tracehub|assisted-by):end'
      [ -f "$file" ] && continue
      case "$file" in
        "$repo"/.husky/*)
          hook="${file##*/}"
          exclude="$(git -C "$repo" rev-parse --path-format=absolute --git-common-dir)/info/exclude"
          [ -f "$exclude" ] && grep -vxF "/.husky/$hook" "$exclude" > "$exclude.tmp" && mv "$exclude.tmp" "$exclude"
          rm -f "$exclude.tmp"
          ;;
      esac
    done < <(legacy_files "$repo")
  done < <(checkouts)

  [ -f "$HUSKY_INIT" ] && drop_block "$HUSKY_INIT" '# config:tracehub:start' '# config:tracehub:end'
  say "hooks on tracehub@$VERSION from $(cd "$(dirname "$GITCONFIG")" && pwd)/assistant-ui.gitconfig, for every assistant-ui repo"
}

cmd_status() {
  local repo file login rules version missing=0 legacy=0 total=0

  login="$(jq -r '.login // empty' "$CONFIG/tracehub/auth.json" 2>/dev/null)"
  rules="$(jq -r 'keys | join(", ")' "$CONFIG/tracehub/consent.json" 2>/dev/null)"
  version="$(git --version | awk '{print $3}')"
  git_new_enough || version="$version (needs $MIN_GIT: brew upgrade git)"
  printf '%-16s %s\n' "signed in as" "${login:-nobody}" "upload rules" "${rules:-none}" "hooks" "tracehub@${VERSION:-?}" "git" "$version"

  while IFS= read -r repo
  do
    total=$((total + 1))
    if [ -z "$(git -C "$repo" config --get hook.tracehub-pre-push.command)" ]
    then
      printf '%-16s %s\n' "no hooks" "$repo"
      missing=$((missing + 1))
    fi
  done < <(checkouts)

  # a plain repo's worktrees share one .git/hooks, so count each file once
  while IFS= read -r file
  do
    if has_block "$file" '# (tracehub|assisted-by):start' || has_block "$file" '# config:tracehub:start'
    then
      printf '%-16s %s\n' "old block" "$file"
      legacy=$((legacy + 1))
    fi
  done < <({ while IFS= read -r repo; do legacy_files "$repo"; done < <(checkouts); printf '%s\n' "$HUSKY_INIT"; } | sort -u)
  printf '%-16s %s\n' "checkouts" "$total, $missing without the hooks, $legacy old block(s) for setup to remove"
}

case "$1" in
  setup)  cmd_setup ;;
  status) cmd_status ;;
esac

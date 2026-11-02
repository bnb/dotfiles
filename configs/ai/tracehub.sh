#!/usr/bin/env bash
# shellcheck shell=bash
#
# Tracehub's git hooks for my work checkouts under ~/GitHub/assistant-ui and
# nowhere else.
#
#   config:tracehub setup | status
#
# `setup` writes the hooks into every assistant-ui checkout and worktree
# there; run it again after cloning or adding a worktree. Sign-in and the
# upload rule come from tracehub's own `setup`, run once by hand.
#
# No global hooks: tracehub refuses them with an [include] in ~/.gitconfig,
# and they'd reach repos outside the directory anyway. Instead:
#
# - plain repos get the hooks in the repo's shared .git/hooks, which covers
#   its worktrees too
# - Husky repos (core.hooksPath .husky/_) get them as untracked files in each
#   worktree's .husky/, listed in the repo's info/exclude
# - Husky branches that track their own .husky/<hook> are covered by
#   ~/.config/husky/init.sh, which Husky sources before every hook
#
# The hook bodies come from tracehub's own hookBlock, so they match what its
# setup would write. An existing tracehub or assisted-by block is replaced in
# place; other hook content is kept.
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
# pinned like the hooks tracehub writes; bump it, then run setup again
VERSION="0.5.2"

case "${1:-}" in
  setup|status) ;;
  *)
    printf 'usage: config:tracehub <setup|status>\n' >&2
    exit 64
    ;;
esac

# One npx per run: re-run this script with tracehub installed, rather than
# paying npx's startup on every call. Its warnings about a checkout's pnpm
# settings in .npmrc are noise here.
if [ -z "${TRACEHUB_NPX:-}" ]
then
  TRACEHUB_NPX=1 NPM_CONFIG_LOGLEVEL=error exec npx --yes --package="tracehub@$VERSION" -- bash "$0" "$@"
fi

# shellcheck source=github-personal.sh
. "$(dirname "${BASH_SOURCE[0]}")/github-personal.sh" || exit 1

say() {
  printf 'config:tracehub - %s\n' "$*"
}

die() {
  say "$*" >&2
  exit 1
}

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

# usage: block <hook>
#
# tracehub's own block for that hook, run through npx at $VERSION
block() {
  local pkg
  pkg="$(dirname "$(command -v tracehub)")/../tracehub"
  node --input-type=module -e "
    import { hookBlock } from '$pkg/dist/git/hooks.js';
    process.stdout.write(hookBlock(process.argv[1], '$VERSION', null));
  " "$1"
}

# usage: hook_file <checkout> <hook>
#
# Where that checkout's hook goes, or nothing when the branch tracks its own
# .husky/<hook> (init.sh covers it) or the checkout sets another hooksPath.
hook_file() {
  local hooks_path
  hooks_path="$(git -C "$1" config --get core.hooksPath)"

  case "$hooks_path" in
    "")
      printf '%s/%s\n' "$(git -C "$1" rev-parse --path-format=absolute --git-path hooks)" "$2"
      ;;
    .husky/_)
      [ -d "$1/.husky" ] || return 0
      git -C "$1" ls-files --error-unmatch ".husky/$2" >/dev/null 2>&1 && return 0
      printf '%s/.husky/%s\n' "$1" "$2"
      ;;
  esac
}

# usage: write_block <file> <block> <start marker> <end marker> [header]
#
# Puts the block in the file: in place of an existing one between the markers
# (extended regexes), else appended, or after the header in a new file.
write_block() {
  local file=$1 text=$2 start=$3 end=$4 header=${5:-} next

  if [ ! -s "$file" ]
  then
    next="$header$text"
  elif grep -Eq "^$start" "$file"
  then
    # the block goes through ENVIRON, since awk -v would unescape its \n
    next="$(TEXT="$text" awk -v start="^$start" -v end="^$end" '
      $0 ~ start { printf "%s", ENVIRON["TEXT"]; skip = 1; next }
      skip && $0 ~ end { skip = 0; next }
      !skip { print }
    ' "$file")"$'\n'
  else
    next="$(cat "$file")"$'\n\n'"$text"
  fi

  [ -s "$file" ] && [ "$next" = "$(cat "$file")"$'\n' ] && return 0
  mkdir -p "$(dirname "$file")"
  printf '%s' "$next" > "$file"
  say "wrote $file"
}

# The hooks for Husky branches that track their own .husky/<hook>, so no
# untracked tracehub hook can sit there. Husky sources init.sh before every
# hook, with the hook's name in $n, its script in $s and its args in "$@".
husky_init() {
  local prepare push
  prepare="$(block prepare-commit-msg | sed 's/^/    /')"
  push="$(block pre-push | sed 's/^/    /')"

  cat <<EOF
# config:tracehub:start
# tracehub@$VERSION for assistant-ui checkouts whose branch tracks its own
# .husky/<hook>. Written by config:tracehub; hooks that already run tracehub
# are skipped.
if [ "\${HUSKY-}" != 0 ] && ! grep -q '^# tracehub:start' "\$s" 2>/dev/null &&
  git config --get remote.origin.url 2>/dev/null | grep -Eiq 'github\\.com[:/]assistant-ui/'; then
  if [ "\$n" = prepare-commit-msg ]; then
$prepare
  elif [ "\$n" = pre-push ]; then
$push
  fi
fi
# config:tracehub:end
EOF
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
  local repo hook file exclude text

  check_login
  [ -n "$(checkouts | head -n 1)" ] || die "no assistant-ui checkouts in $DIR"

  for hook in $HOOKS
  do
    text="$(block "$hook")"$'\n' || die "couldn't get tracehub@$VERSION's $hook hook"
    while IFS= read -r repo
    do
      file="$(hook_file "$repo" "$hook")"
      [ -n "$file" ] || continue
      if [ "$file" = "$repo/.husky/$hook" ]
      then
        exclude="$(git -C "$repo" rev-parse --path-format=absolute --git-common-dir)/info/exclude"
        mkdir -p "$(dirname "$exclude")"
        grep -qxF "/.husky/$hook" "$exclude" 2>/dev/null || printf '%s\n' "/.husky/$hook" >> "$exclude"
      fi
      write_block "$file" "$text" '# (tracehub|assisted-by):start' '# (tracehub|assisted-by):end' $'#!/bin/sh\n'
      chmod +x "$file"
    done < <(checkouts)
  done

  write_block "$HUSKY_INIT" "$(husky_init)"$'\n' '# config:tracehub:start' '# config:tracehub:end'
  say "hooks on tracehub@$VERSION for $DIR"
}

cmd_status() {
  local repo hook file login rules missing=0 total=0

  login="$(jq -r '.login // empty' "$CONFIG/tracehub/auth.json" 2>/dev/null)"
  rules="$(jq -r 'keys | join(", ")' "$CONFIG/tracehub/consent.json" 2>/dev/null)"
  printf '%-16s %s\n' "signed in as" "${login:-nobody}" "upload rules" "${rules:-none}"

  while IFS= read -r repo
  do
    total=$((total + 1))
    for hook in $HOOKS
    do
      file="$(hook_file "$repo" "$hook")"
      [ -n "$file" ] || continue
      if ! grep -qF "tracehub@$VERSION hook $hook" "$file" 2>/dev/null
      then
        printf '%-16s %s\n' "needs setup" "$file"
        missing=$((missing + 1))
      fi
    done
  done < <(checkouts)

  if ! grep -qF "tracehub@$VERSION hook" "$HUSKY_INIT" 2>/dev/null
  then
    printf '%-16s %s\n' "needs setup" "$HUSKY_INIT"
    missing=$((missing + 1))
  fi
  printf '%-16s %s\n' "checkouts" "$total, $missing hook file(s) to update"
}

case "$1" in
  setup)  cmd_setup ;;
  status) cmd_status ;;
esac

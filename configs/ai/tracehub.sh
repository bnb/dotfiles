#!/usr/bin/env bash
# shellcheck shell=bash
#
# Tracehub (the assisted-by CLI's git hooks) for my work checkouts under
# ~/GitHub/assistant-ui and nowhere else.
#
#   config:tracehub setup | on | off | toggle | status
#
# `setup` signs tracehub in as me, then runs assisted-by's own guided setup
# pointed at that directory: hooks in each checkout, and consent. `on` and
# `off` flip consent for each checkout there, which is the switch the hooks
# check before they touch a commit or a push, so the hooks can stay installed.
# `toggle` (also the toggle:tracehub alias) turns it off if every checkout is
# on, and on otherwise.
#
# No global hooks: assisted-by refuses them with an [include] in ~/.gitconfig,
# and they'd reach repos outside the directory anyway.
#
# Tracehub is always signed in as me, whichever account toggle:ai-github gives
# the agents: its sign-in is its own, not gh's or git's. A tracehub session
# belongs to the account that first uploaded it and refuses anyone else's
# appends, so uploads that followed the agents' account would strand every
# session whose commits got pushed by both.

set -uo pipefail

DIR="${PERSONAL_GITHUB_DIR:-$HOME/GitHub}/assistant-ui"
# pinned like the hooks assisted-by writes; bump it, then run setup again
VERSION="0.4.3"

case "${1:-}" in
  setup|on|off|toggle|status) ;;
  *)
    printf 'usage: config:tracehub <setup|on|off|toggle|status>\n' >&2
    exit 64
    ;;
esac

# One npx per run: re-run this script with assisted-by on PATH, rather than
# paying npx's startup on every call. Its warnings about a checkout's pnpm
# settings in .npmrc are noise here.
if [ -z "${TRACEHUB_NPX:-}" ]
then
  TRACEHUB_NPX=1 NPM_CONFIG_LOGLEVEL=error exec npx --yes --package="assisted-by@$VERSION" -- bash "$0" "$@"
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

# every assistant-ui checkout directly under $DIR
checkouts() {
  local repo

  for repo in "$DIR"/*/
  do
    case "$(git -C "$repo" remote get-url origin 2>/dev/null | tr '[:upper:]' '[:lower:]')" in
      *github.com[:/]assistant-ui/*) printf '%s\n' "${repo%/}" ;;
    esac
  done
}

# usage: field <checkout> consent|login
#
# A line of assisted-by's status there: consent is yes, no, or "not given ...",
# login is the account tracehub is signed in as (with a note if it expired).
field() {
  (cd "$1" && assisted-by status 2>/dev/null) | sed -n "s/^$2: //p"
}

cmd_setup() {
  local me login repo exclude path

  repo="$(checkouts | head -n 1)"
  [ -n "$repo" ] || die "no assistant-ui checkouts in $DIR"

  # Signed in first, on its own, so a wrong account is caught before setup
  # enables anything with it. The browser decides which account that is.
  me="$(personal_github_login)"
  say "sign in to tracehub as ${me:-your own GitHub account}, not the automation account - if the browser's signed in as the bot, open the link in a private window"
  assisted-by login || return 1
  login="$(field "$repo" login)"
  case "$login" in
    "not logged in"*) die "not signed in to tracehub, so nothing was set up" ;;
  esac
  login="${login%% *}"
  if [ -n "$me" ] && [ "$login" != "$me" ]
  then
    assisted-by logout >/dev/null
    die "tracehub was signed in as $login, not $me, so that sign-in's been removed - run setup again"
  fi

  assisted-by setup "$DIR" || return 1

  # In Husky checkouts the hooks are new files in .husky/, which git would
  # otherwise offer to commit. info/exclude is shared by every worktree.
  while IFS= read -r repo
  do
    [ "$(git -C "$repo" config core.hooksPath)" = ".husky/_" ] || continue
    exclude="$(git -C "$repo" rev-parse --path-format=absolute --git-common-dir)/info/exclude"
    mkdir -p "$(dirname "$exclude")"
    for path in /.husky/prepare-commit-msg /.husky/pre-push
    do
      grep -qxF "$path" "$exclude" 2>/dev/null || printf '%s\n' "$path" >> "$exclude"
    done
  done < <(checkouts)
}

# usage: set_consent yes|no
set_consent() {
  local repo found=""

  while IFS= read -r repo
  do
    found=1
    (cd "$repo" && assisted-by consent "--$1" >/dev/null) || die "couldn't record consent for $repo"
  done < <(checkouts)

  [ -n "$found" ] || die "no assistant-ui checkouts in $DIR"
  if [ "$1" = yes ]
  then
    say "on for $DIR - pushes from there upload the sessions behind their commits, shared with each repo's maintainers"
  else
    say "off for $DIR - commits and pushes there are left alone"
  fi
}

cmd_toggle() {
  local repo

  while IFS= read -r repo
  do
    if [ "$(field "$repo" consent)" != yes ]
    then
      set_consent yes
      return
    fi
  done < <(checkouts)

  set_consent no
}

cmd_status() {
  local repo login=""

  while IFS= read -r repo
  do
    if [ -z "$login" ]
    then
      login="$(field "$repo" login)"
      printf '%-24s %s\n' "signed in as" "$login"
    fi
    printf '%-24s %s\n' "$(basename "$repo")" "$(field "$repo" consent)"
  done < <(checkouts)
}

case "$1" in
  setup)  cmd_setup ;;
  on)     set_consent yes ;;
  off)    set_consent no ;;
  toggle) cmd_toggle ;;
  status) cmd_status ;;
esac

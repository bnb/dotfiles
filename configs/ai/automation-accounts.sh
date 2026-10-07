#!/usr/bin/env bash
# shellcheck shell=bash
#
# Puts the AI agents on my automation accounts instead of my personal ones:
# Claude Code outside work sessions on the GitHub automation account, and
# Claude Code and Codex on @bot.bnb.im for Tangled. My terminal, Codex and
# Claude Code's work sessions keep my own GitHub account. Otherwise anything an
# agent runs - `gh pr create`, `tg pr create`, `git push`, a commit - happens
# as the bot for that forge.
#
#   config:ai-github  login | apply | remove | toggle
#   config:ai-tangled login | apply | remove
#   config:ai-github status   (either alias - it shows both forges)
#
# `login` is once per machine and runs `apply` itself; setup.sh re-runs `apply`
# for both. `remove` unwires one forge and leaves its login alone. `toggle`
# (also the toggle:ai-github alias) flips GitHub between the automation account
# and mine, and `apply` - setup.sh's included - leaves it off until it's
# toggled back.
#
# It all hangs off environment variables set only in the agents' own config -
# Claude Code's settings (see claude_targets) and ~/.codex/config.toml's
# [shell_environment_policy.set] - so nothing outside them ever sees them:
#
#   GH_CONFIG_DIR      a second gh config directory with only the GitHub
#                      automation account logged in, so `gh` acts as it
#   TG_ACCOUNT         the Tangled bot's DID. tg keeps every account in one
#                      keyring and this picks which one a command uses, so my
#                      own stays tg's default
#   TG_PROTOCOL        https, so `tg repo clone` makes remotes git can push to
#                      with the credential helper below
#   GIT_CONFIG_GLOBAL  a generated gitconfig that includes ~/.gitconfig and
#                      then one fragment per forge the agent is on the bot
#                      for, each of which:
#                        - authenticates HTTPS through that forge's CLI, which
#                          reads the variables above
#                        - commits as the bot
#                      GitHub's identity is the default; Tangled's applies to
#                      repos with a Tangled remote, and wins if a repo has both.
#
# On GitHub the bot has its own SSH keys in 1Password - a signing key and an
# authentication key - and `apply` finds them by asking GitHub which keys the
# account has and the 1Password agent which of those it holds. Agents sign
# every commit with the first, and push over SSH with only the second, so my
# personal key never gets offered. Without 1Password, or before those keys are
# in it, GitHub falls back to what Tangled always does: unsigned commits, and
# SSH remotes sent over HTTPS, since SSH would authenticate with my personal key.
#
# Has to run under bash 3.2: setup.sh calls `apply`, and on a fresh mac that's
# the only bash there is.

set -uo pipefail

# resolve_op_ssh_sign and the 1Password agent socket paths, shared with setup.sh
# shellcheck source=../../setup/lib/onepassword.sh
. "$(dirname "${BASH_SOURCE[0]}")/../../setup/lib/onepassword.sh" || exit 1
# gh_personal and personal_github_login, shared with tracehub.sh
# shellcheck source=github-personal.sh
. "$(dirname "${BASH_SOURCE[0]}")/github-personal.sh" || exit 1

# absolute, since generated configs include files from it
DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)" || exit 1

CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
AI_AGENTS_DIR="${AI_AGENTS_DIR:-$CONFIG_HOME/ai-agents}"
AI_GITCONFIG="$AI_AGENTS_DIR/gitconfig"
# GIT_CONFIG_GLOBAL for the agents that keep my own GitHub account
AI_GITCONFIG_WITHOUT_GITHUB="$AI_AGENTS_DIR/gitconfig-without-github"
AI_SSH_CONFIG="$AI_AGENTS_DIR/ssh_config"
AI_GITHUB_AUTH_KEY="$AI_AGENTS_DIR/github-auth.pub"
AI_GITHUB_SIGNING_KEY="$AI_AGENTS_DIR/github-signing.pub"
AI_GITHUB_DIR="${AI_GITHUB_DIR:-$CONFIG_HOME/gh-automation}"
# present while `toggle` has agents on my own GitHub account
AI_GITHUB_OFF="$AI_AGENTS_DIR/github.off"
AI_TANGLED_HANDLE="${AI_TANGLED_HANDLE:-bot.bnb.im}"

# Always the real ~/.claude, never $CLAUDE_CONFIG_DIR: inside a `clauth start`
# session that's a per-profile runtime copy, and clauth regenerates it from
# this file anyway.
CLAUDE_SETTINGS="$HOME/.claude/settings.json"
CODEX_CONFIG="${CODEX_HOME:-$HOME/.codex}/config.toml"
CLAUTH_DIR="$HOME/.clauth"
# the clauth profile work sessions run on - vscode-claude.sh starts it
CLAUTH_WORK_PROFILE=work

# Tangled's hosted git endpoint, and the domain it used to be on
TANGLED_HOSTS="tangled.org tangled.sh"

FORGE=""

say() {
  printf 'config:ai-%s - %s\n' "${FORGE:-accounts}" "$*"
}

warn() {
  printf 'config:ai-%s - %s\n' "${FORGE:-accounts}" "$*" >&2
}

die() {
  warn "$*"
  exit 1
}

need() {
  command -v "$1" >/dev/null 2>&1 || die "$1 isn't installed"
}

# tg as me, whatever launched this - from inside an agent session the
# variables above are already set, so they're cleared.
tg_personal() {
  env -u TG_ACCOUNT -u TG_PROTOCOL -u GIT_CONFIG_GLOBAL tg "$@"
}

# gh exactly as an agent sees it. GIT_CONFIG_GLOBAL is here for `login`: if gh
# asks "authenticate Git with your GitHub credentials?" and gets a yes, it
# writes a credential helper with `git config --global`, which would otherwise
# put the automation account's helper in my own ~/.gitconfig. Pointed here,
# that lands in the GitHub fragment, which `apply` rewrites anyway.
gh_automation() {
  env -u GH_TOKEN -u GITHUB_TOKEN \
    GH_CONFIG_DIR="$AI_GITHUB_DIR" \
    GIT_CONFIG_GLOBAL="$AI_AGENTS_DIR/github.gitconfig" \
    gh "$@"
}

# usage: tangled_did active | <handle-or-did>
#
# The DID of tg's default account, or of the logged-in account with that
# handle. Empty when there isn't one.
tangled_did() {
  tg_personal auth list --json 2>/dev/null | python3 -c '
import json, sys
want = sys.argv[1].lower()
try:
    accounts = json.load(sys.stdin) or []
except ValueError:
    accounts = []
for a in accounts:
    if (a.get("active") if want == "active" else want in (a.get("handle", "").lower(), a.get("did", "").lower())):
        print(a.get("did", ""))
        break
' "$1" 2>/dev/null || true
}

# "<did> <handle>" for the account tg acts as in my terminal: the one
# configs/tg/config.toml pins, or tg's default without it. Empty when that
# account isn't logged in. Asks the PDS, so it's a network round trip.
tangled_terminal_account() {
  tg_personal auth status --json 2>/dev/null | python3 -c '
import json, sys
try:
    status = json.load(sys.stdin) or {}
except ValueError:
    status = {}
if status.get("authenticated"):
    print(status.get("did", ""), status.get("handle", ""))
' 2>/dev/null || true
}

# Local check only - `gh auth status` would go to the network
github_logged_in() {
  [ -f "$AI_GITHUB_DIR/hosts.yml" ] && grep -q '^github\.com:' "$AI_GITHUB_DIR/hosts.yml"
}

# The 1Password agent's socket, or nothing: the link setup.sh makes on macOS
# (and where the linux app puts it), then where the mac app really keeps it.
op_agent_sock() {
  local sock

  for sock in "$OP_SSH_AGENT_SOCK" "$OP_SSH_AGENT_SOCK_MACOS"
  do
    if [ -S "$sock" ]
    then
      printf '%s\n' "$sock"
      return 0
    fi
  done
}

# usage: op_github_key <socket> <login> keys|ssh_signing_keys
#
# The first key in the 1Password agent that GitHub has on file for <login> as
# an authentication key (keys) or a signing key (ssh_signing_keys), as
# "<type> <key> <1Password item title>". Empty when there isn't one. Both lists
# are public, so this works whichever account gh is logged in as. Keys pinned
# in configs/git are skipped: they're <login>'s work keys, for work repos only.
op_github_key() {
  local registered

  registered="$(gh_automation api "users/$2/$3" --jq '.[].key' 2>/dev/null | awk '{ print $1, $2 }')"
  [ -n "$registered" ] || return 0

  SSH_AUTH_SOCK="$1" ssh-add -L 2>/dev/null | while read -r type key title
  do
    grep -qsF -- "$key" "$DOTFILES_DIR"/configs/git/* && continue
    if printf '%s\n' "$registered" | grep -Fqx "$type $key"
    then
      printf '%s %s %s\n' "$type" "$key" "$title"
      break
    fi
  done
}

# usage: edit_env json|toml:<table> set|remove|check <file> KEY=VALUE...
#
# Sets, removes or reports environment variables in an agent's config - the
# `env` object of a JSON file, or the named table of a TOML one - leaving
# every other key where it was. Nothing is written when nothing would change;
# otherwise the file is backed up to <file>.backup.<timestamp> first, by
# setup/lib/config_file.py. (`remove` only looks at the keys.)
edit_env() {
  PYTHONPATH="$DOTFILES_DIR/setup/lib${PYTHONPATH:+:$PYTHONPATH}" PYTHONDONTWRITEBYTECODE=1 \
    python3 - "$@" <<'PY'
import copy, json, re, sys
from config_file import read, read_json, write, write_json

fmt, mode, path = sys.argv[1:4]
want = dict(arg.split("=", 1) for arg in sys.argv[4:])
NOTE = "  # automation accounts for AI agents - github.com/bnb/dotfiles configs/ai\n"


# both forges set it, so it says nothing about whether this one is wired
SHARED = {"GIT_CONFIG_GLOBAL"}


def describe(env):
    if all(env.get(k) == v for k, v in want.items()):
        return "wired"
    if not any(k in env for k in want if k not in SHARED):
        return "not wired"
    return "out of date - run apply"


def finish(env, write_new):
    if mode == "check":
        print(describe(env))
    elif mode == "set" and describe(env) == "wired":
        print("already wired: %s" % path)
    elif mode == "remove" and not any(k in env for k in want):
        print("nothing to remove: %s" % path)
    else:
        write_new()


if fmt == "json":
    data = read_json(path)
    if not isinstance(data.get("env"), (dict, type(None))):
        sys.exit("%s has an \"env\" that isn't an object - leaving it alone" % path)

    def write_env():
        # `or`, not setdefault: "env": null would hand back None
        env = data["env"] = data.get("env") or {}
        for k, v in want.items():
            if mode == "set":
                env[k] = v
            else:
                env.pop(k, None)
        write_json(path, data)
        print("updated %s" % path)

    finish(data.get("env") or {}, write_env)
    sys.exit(0)

# toml - Codex and clauth rewrite their files themselves, so this is edited
# line by line rather than re-serialised, and the result has to parse to the
# same document with only our keys changed before it's written.
table = fmt.split(":", 1)[1].split(".")
try:
    import tomllib
except ImportError:
    try:
        import tomli as tomllib
    except ImportError:
        tomllib = None

SNIPPET = "".join("%s = %s\n" % (k, json.dumps(v)) for k, v in want.items())
BY_HAND = "add these to its [%s] by hand:\n\n%s" % (".".join(table), SNIPPET)


def env_of(doc):
    for key in table:
        doc = doc.get(key, {}) if isinstance(doc, dict) else {}
    return doc if isinstance(doc, dict) else {}


def without_ours(doc):
    def strip(parent, path):
        child = parent.get(path[0])
        if not isinstance(child, dict):
            return
        if len(path) > 1:
            strip(child, path[1:])
        else:
            for k in want:
                child.pop(k, None)
        if not child:
            del parent[path[0]]

    doc = copy.deepcopy(doc)
    strip(doc, table)
    return doc


text = read(path)
if tomllib is None:
    if mode == "check":
        # good enough for a status line
        present = {k: v for k, v in want.items() if "%s = %s" % (k, json.dumps(v)) in text}
        print(describe(present))
        sys.exit(0)
    # A skip rather than a failure: on a python older than 3.11 (Ubuntu 22.04's)
    # every run would otherwise fail, and setup.sh would say so every time.
    sys.stderr.write(
        "no TOML parser here (needs python 3.11+, or `pip install tomli`), so %s "
        "can't be edited safely - skipping it.\n%s" % (path, BY_HAND)
    )
    sys.exit(0)

try:
    old_doc = tomllib.loads(text)
except tomllib.TOMLDecodeError as e:
    sys.exit("%s isn't valid TOML (%s) - leaving it alone" % (path, e))


def write_toml():
    header = re.compile(r"^\[\s*%s\s*\]\s*(#.*)?$" % r"\s*\.\s*".join(map(re.escape, table)))
    any_table = re.compile(r"^\[")
    ours = re.compile(r'^\s*"?(%s)"?\s*=' % "|".join(re.escape(k) for k in want))
    lines = text.splitlines(True)
    if lines and not lines[-1].endswith("\n"):
        lines[-1] += "\n"
    new_lines = ["%s = %s%s" % (k, json.dumps(v), NOTE) for k, v in want.items()]

    start = next((i for i, l in enumerate(lines) if header.match(l)), None)
    if start is None:
        out = lines + ["\n", "[%s]\n" % ".".join(table)] + new_lines
    else:
        end = next(
            (j for j in range(start + 1, len(lines)) if any_table.match(lines[j])),
            len(lines),
        )
        body = [l for l in lines[start + 1 : end] if not ours.match(l)]
        if mode == "set":
            body = new_lines + body
        out = lines[: start + 1] + body + lines[end:]

    new = "".join(out)
    try:
        new_doc = tomllib.loads(new)
    except tomllib.TOMLDecodeError:
        new_doc = None
    expected = want if mode == "set" else {}
    if (
        new_doc is None
        or without_ours(new_doc) != without_ours(old_doc)
        or {k: v for k, v in env_of(new_doc).items() if k in want} != expected
    ):
        sys.exit("couldn't edit %s without touching anything else - leaving it alone.\n%s" % (path, BY_HAND))
    write(path, new)
    print("updated %s" % path)


finish(env_of(old_doc), write_toml)
PY
}

# usage: claude_targets outside|work set|remove|check
#
# Where Claude Code's variables go for sessions outside work, or for work
# sessions, as "<format> <file>" lines.
#
# Work sessions are the ones clauth starts on its work profile: Claude in VS
# Code, through vscode-claude.sh, and `clauth start work`. clauth builds each
# session's settings from ~/.claude/settings.json, minus the keys in the
# active profile's [env], plus the keys in its own profile's [env]. So the
# variables go in the work profile's [env] for work sessions and in every
# other profile's for the rest. ~/.claude/settings.json gets the active
# profile's set, the same as clauth writes there on a switch, so the desktop
# app and plain `claude` don't wait for one. Without a work profile there are
# no work sessions, and everything goes in ~/.claude/settings.json.
#
# The profiles come first when setting and last when removing. clauth copies
# any key in ~/.claude/settings.json that no profile's [env] has into every
# running session, work sessions included.
claude_targets() {
  if [ ! -f "$CLAUTH_DIR/profiles/$CLAUTH_WORK_PROFILE/config.toml" ]
  then
    [ "$1" = outside ] && echo "json $CLAUDE_SETTINGS"
    return 0
  fi

  python3 - "$@" "$CLAUTH_DIR" "$CLAUTH_WORK_PROFILE" "$CLAUDE_SETTINGS" <<'PY'
import os, sys

try:
    import tomllib
except ImportError:
    try:
        import tomli as tomllib
    except ImportError:
        sys.exit("no TOML parser here (needs python 3.11+, or `pip install tomli`) to read clauth's profiles - leaving Claude Code alone")

audience, mode, clauth, work, settings = sys.argv[1:]
with open(os.path.join(clauth, "profiles.toml"), "rb") as f:
    roster = tomllib.load(f)


def wanted(profile):
    return (profile == work) == (audience == "work")


targets = [
    "toml:env %s" % os.path.join(clauth, "profiles", p, "config.toml")
    for p in roster.get("profiles", [])
    if wanted(p)
]
# no active profile reads as outside work, like a machine without clauth
if wanted(roster.get("active_profile")):
    base = "json %s" % settings
    targets = [base] + targets if mode == "remove" else targets + [base]
print("\n".join(targets))
PY
}

# usage: wire claude-outside|claude-work|codex set|remove|check KEY=VALUE...
#
# A failed file doesn't stop the rest, but it does fail the run, so setup.sh
# puts it in its summary. `check` prints one status for all the files.
wire() {
  local agent="$1" mode="$2" targets fmt file status="" failed=0
  shift 2

  case "$agent" in
    claude-*) targets="$(claude_targets "${agent#claude-}" "$mode")" || return 1 ;;
    codex)    targets="toml:shell_environment_policy.set $CODEX_CONFIG" ;;
  esac

  while read -r fmt file
  do
    [ -n "$file" ] || continue

    # no directory means the agent isn't installed here, not that it's broken
    if [ ! -d "$(dirname "$file")" ]
    then
      if [ "$mode" = check ]
      then
        status="$status
not installed"
      else
        say "$(dirname "$file") doesn't exist - skipping it"
      fi
      continue
    fi

    if [ "$mode" = check ]
    then
      status="$status
$(edit_env "$fmt" check "$file" "$@")"
    else
      edit_env "$fmt" "$mode" "$file" "$@" || { warn "couldn't update $file"; failed=1; }
    fi
  done <<EOF
$targets
EOF

  if [ "$mode" = check ]
  then
    status="$(printf '%s\n' "$status" | sed '/^$/d' | sort -u)"
    case "$status" in
      *"
"*) echo "out of date - run apply" ;;
      *) echo "${status:-not wired}" ;;
    esac
  fi
  return "$failed"
}

restart_note() {
  say "restart any running Claude Code / Codex sessions to pick this up"
}

# usage: install_file <tmp> <dest>
#
# Moves a freshly generated file into place, unless it's identical to what's
# already there.
install_file() {
  if [ -f "$2" ] && cmp -s "$1" "$2"
  then
    rm -f "$1"
    say "already up to date: $2"
    return 0
  fi

  chmod 644 "$1"
  mv "$1" "$2" || return 1
  say "wrote $2"
}

new_tmp() {
  mkdir -p "$AI_AGENTS_DIR" && mktemp "$AI_AGENTS_DIR/.tmp.XXXXXX"
}

# usage: write_top_gitconfig <file> <who uses it> <fragment>...
#
# A file GIT_CONFIG_GLOBAL points at. Same content whichever forge writes it;
# git skips an include whose file doesn't exist, so a forge that isn't set up
# simply isn't there.
write_top_gitconfig() {
  local file="$1" who="$2" tmp fragment
  shift 2

  tmp="$(new_tmp)" || return 1
  {
    cat <<EOF
# Generated by configs/ai/automation-accounts.sh in github.com/bnb/dotfiles.
# Don't edit it - \`config:ai-github apply\` or \`config:ai-tangled apply\`
# rewrites the whole thing.
#
# For $who.
#
# GIT_CONFIG_GLOBAL points them at this file, so for them it stands in for
# ~/.gitconfig: it pulls in everything that would normally load, then each
# forge's overrides.

# GIT_CONFIG_GLOBAL replaces both of these, so include them back, in the order
# git reads them
[include]
	path = $CONFIG_HOME/git/config
[include]
	path = ~/.gitconfig

EOF
    for fragment in "$@"
    do
      printf '[include]\n\tpath = %s\n' "$fragment"
    done
  } > "$tmp"
  install_file "$tmp" "$file"
}

write_top_gitconfigs() {
  # Tangled last, so its identity wins in a repo with remotes on both forges
  write_top_gitconfig "$AI_GITCONFIG" "Claude Code outside work sessions" \
    github.gitconfig tangled.gitconfig || return 1
  write_top_gitconfig "$AI_GITCONFIG_WITHOUT_GITHUB" \
    "Codex and Claude Code's work sessions, which keep my own GitHub account" \
    tangled.gitconfig
}

# usage: work_includes <login>
#
# The dotfiles .gitconfig gives work repos my work identity with includeIfs
# for configs/git/<org>.gitconfig. These are the same conditions, pointed at
# <login>'s own identity for that org, configs/git/<org>-<login>.gitconfig,
# wherever there is one.
work_includes() {
  local name path

  git config --file "$DOTFILES_DIR/.gitconfig" --get-regexp '^includeif\..*\.path$' |
    while read -r name path
    do
      path="$DOTFILES_DIR/${path%.gitconfig}-$1.gitconfig"
      [ -f "$path" ] || continue
      name="${name#includeif.}"
      printf '[includeIf "%s"]\n\tpath = %s\n' "${name%.path}" "$path"
    done
}

# usage: write_github_gitconfig <login> <id> <path to gh> <signing key> <op-ssh-sign> <auth key>
#
# The keys are "<type> <key> <1Password item title>" lines from op_github_key.
# Without a signing key the bot's commits go unsigned; without an
# authentication key its SSH remotes go over HTTPS.
write_github_gitconfig() {
  local tmp work

  tmp="$(new_tmp)" || return 1
  {
    cat <<EOF
# Generated by configs/ai/automation-accounts.sh - \`config:ai-github apply\`
# rewrites it. Included by ./gitconfig.

# The default identity for anything an agent commits
[user]
	name = $1
	email = $2+$1@users.noreply.github.com
[github]
	user = $1

EOF

    if [ -n "$4" ]
    then
      cat <<EOF
# Signed with "${4#* * }", $1's signing key in 1Password, so GitHub
# marks the commits Verified. 1Password asks before it signs for an app it
# hasn't yet - an agent's commit waits on that.
[user]
	signingkey = key::$(echo "$4" | cut -d ' ' -f 1-2)
[gpg]
	format = ssh
[gpg "ssh"]
	program = $5
[commit]
	gpgsign = true
EOF
    else
      cat <<EOF
# Unsigned: the signing key in ~/.gitconfig.local is my personal account's, so
# GitHub would mark these commits Unverified - and 1Password would stop the
# agent to ask for Touch ID on every one. \`apply\` signs with $1's own key
# once it's in 1Password.
[commit]
	gpgsign = false
[tag]
	gpgsign = false
EOF
    fi

    cat <<EOF

# HTTPS goes through gh, which reads GH_CONFIG_DIR and so answers with $1's
# token. The empty helper first clears anything set before this point, like
# osxkeychain, which may well be holding my personal credentials.
[credential "https://github.com"]
	helper =
	helper = !'$3' auth git-credential
[credential "https://gist.github.com"]
	helper =
	helper = !'$3' auth git-credential

EOF

    if [ -n "$6" ]
    then
      cat <<EOF
# SSH goes through ./ssh_config, which offers GitHub only "${6#* * }",
# $1's authentication key in 1Password, and never my personal one. HTTPS
# remotes push that way too. Fetching over HTTPS stays on gh's token, so
# anything that only fetches - a package manager, say - doesn't wait on
# 1Password.
[core]
	sshCommand = ssh -F '$AI_SSH_CONFIG'
[url "git@github.com:"]
	pushInsteadOf = https://github.com/
EOF
    else
      cat <<EOF
# SSH would authenticate with my personal key from the 1Password agent, so
# GitHub SSH remotes go over HTTPS instead
[url "https://github.com/"]
	insteadOf = git@github.com:
	insteadOf = ssh://git@github.com/
EOF
    fi

    work="$(work_includes "$1")"
    if [ -n "$work" ]
    then
      cat <<EOF

# Work repos get $1's work identity instead, under the same conditions as
# mine in $DOTFILES_DIR/.gitconfig. Last, so it wins.
$work
EOF
    fi
  } > "$tmp"
  install_file "$tmp" "$AI_AGENTS_DIR/github.gitconfig"
}

# usage: write_public_key <key> <file>
#
# One of op_github_key's lines as a public key file, or no file for no key.
# `status` reads them back.
write_public_key() {
  local tmp

  if [ -z "$1" ]
  then
    rm -f "$2"
    return 0
  fi

  tmp="$(new_tmp)" || return 1
  printf '%s\n' "$1" > "$tmp"
  install_file "$tmp" "$2"
}

# usage: write_github_ssh <1Password agent socket>
#
# The ssh config agents' git uses (core.sshCommand, above). It names the
# authentication key's public half, and 1Password's agent answers with the
# private key that matches.
write_github_ssh() {
  local tmp

  tmp="$(new_tmp)" || return 1
  cat > "$tmp" <<EOF
# Generated by configs/ai/automation-accounts.sh - \`config:ai-github apply\`
# rewrites it. Agents' git runs ssh with this in place of ~/.ssh/config.

# GitHub gets only the automation account's authentication key, from 1Password.
Host github.com ssh.github.com
	IdentityAgent "$1"
	IdentityFile "$AI_GITHUB_AUTH_KEY"
	IdentitiesOnly yes

# Everything else as usual. -F skips the system-wide config too, so that comes
# back as well. GitHub is excluded: ssh adds up IdentityFiles from every block
# that matches, so a personal key for github.com in ~/.ssh/config would still
# get offered whenever the bot's key wasn't used.
Host * !github.com !ssh.github.com
	Include ~/.ssh/config
	Include /etc/ssh/ssh_config
EOF
  install_file "$tmp" "$AI_SSH_CONFIG"
}

# usage: write_tangled_gitconfig <handle> <did> <path to tg>
write_tangled_gitconfig() {
  local tmp host

  tmp="$(new_tmp)" || return 1
  {
    cat <<EOF
# Generated by configs/ai/automation-accounts.sh - \`config:ai-tangled apply\`
# rewrites it. Included by ./gitconfig.

# HTTPS goes through tg, which reads TG_ACCOUNT and so mints a short-lived push
# token for the repo's knot as $1. The empty helper first clears anything set
# before this point, like osxkeychain.
[credential "https://tangled.org"]
	helper =
	helper = !'$3' auth git-credential

# SSH would authenticate with my personal key from the 1Password agent, so
# Tangled SSH remotes go over HTTPS instead - and tangled.sh remotes go to
# tangled.org, the only host tg's credential helper answers for. Repos on a
# self-hosted knot keep their own URLs.
[url "https://tangled.org/"]
EOF
    for host in $TANGLED_HOSTS
    do
      printf '\tinsteadOf = git@%s:\n' "$host"
      printf '\tinsteadOf = ssh://git@%s/\n' "$host"
    done
    printf '\tinsteadOf = https://tangled.sh/\n'

    cat <<EOF

# Commit as $1 in any repo with a Tangled remote. Tangled credits a commit to
# the account whose DID is the committer email, so no address is needed.
# Unsigned, for the same reason as the GitHub fragment. These match the URL as
# written in the repo's config, before the rewrite above.
EOF
    for host in $TANGLED_HOSTS
    do
      # `git@host:**` would miss handle/repo paths: ** only spans slashes as
      # a whole path component
      printf '[includeIf "hasconfig:remote.*.url:git@%s:*"]\n\tpath = tangled-identity.gitconfig\n' "$host"
      printf '[includeIf "hasconfig:remote.*.url:git@%s:*/**"]\n\tpath = tangled-identity.gitconfig\n' "$host"
      printf '[includeIf "hasconfig:remote.*.url:ssh://git@%s/**"]\n\tpath = tangled-identity.gitconfig\n' "$host"
      printf '[includeIf "hasconfig:remote.*.url:https://%s/**"]\n\tpath = tangled-identity.gitconfig\n' "$host"
    done
  } > "$tmp"
  install_file "$tmp" "$AI_AGENTS_DIR/tangled.gitconfig" || return 1

  tmp="$(new_tmp)" || return 1
  cat > "$tmp" <<EOF
# Generated by configs/ai/automation-accounts.sh - \`config:ai-tangled apply\`
# rewrites it. Included by ./tangled.gitconfig, for repos with a Tangled remote.
[user]
	name = $1
	email = $2
[commit]
	gpgsign = false
[tag]
	gpgsign = false
EOF
  install_file "$tmp" "$AI_AGENTS_DIR/tangled-identity.gitconfig"
}

# --- GitHub ------------------------------------------------------------------

# usage: with_github_env <command> [args...]
#
# Runs the command with GitHub's KEY=VALUE pairs, for Claude Code outside work
# sessions, appended as separate, quoted arguments - the values are paths, so
# they can't go through word splitting.
with_github_env() {
  "$@" "GH_CONFIG_DIR=$AI_GITHUB_DIR" "GIT_CONFIG_GLOBAL=$AI_GITCONFIG"
}

cmd_github_login() {
  local arg with_token="" personal automation

  need gh

  for arg in "$@"
  do
    case "$arg" in
      --with-token) with_token=1 ;;
    esac
  done

  mkdir -p "$AI_GITHUB_DIR" "$AI_AGENTS_DIR" && chmod 700 "$AI_GITHUB_DIR" || die "couldn't create $AI_GITHUB_DIR"

  # Every gh config directory shares one keychain service, with each account's
  # token filed under its username - plus a legacy unkeyed slot that logging in
  # clears. gh only falls back to that slot when the per-user entry is missing,
  # so check mine exists before a second login empties it.
  personal="$(personal_github_login)"
  if [ -n "$personal" ] && ! gh_personal auth token --hostname github.com --user "$personal" >/dev/null 2>&1
  then
    die "gh has no per-account token stored for $personal, so this login would sign your terminal out. run \`gh auth refresh\` first, then try again"
  fi

  if [ -z "$with_token" ]
  then
    say "sign the browser into the AUTOMATION account before entering the code - the code authorizes whichever account the browser is signed into"
    # workflow, so an agent can push changes under .github/workflows
    set -- --web --scopes workflow "$@"
  fi

  gh_automation auth login --hostname github.com --git-protocol https "$@" || die "gh auth login failed"

  automation="$(gh_automation api user --jq .login 2>/dev/null || true)"
  if [ -n "$personal" ] && [ "$automation" = "$personal" ]
  then
    # Not `gh auth logout`: that deletes the keychain entry for the username,
    # and the entry for $personal is the one the terminal is using.
    rm -f "$AI_GITHUB_DIR/hosts.yml"
    die "that logged in as $personal - your personal account. sign the browser into the automation account (or use a private window) and run login again"
  fi

  cmd_github_apply
}

cmd_github_apply() {
  local who login id personal signer sock signing="" auth="" failed=0

  need gh
  need git
  need python3

  # toggled off on purpose, so setup.sh's re-apply mustn't switch it back
  if [ -f "$AI_GITHUB_OFF" ]
  then
    say "Claude Code is toggled to your own GitHub account - \`toggle:ai-github\` switches it back to the automation account"
    return 0
  fi

  if ! github_logged_in
  then
    warn "the automation account isn't logged in at $AI_GITHUB_DIR - run \`config:ai-github login\` first"
    return 2
  fi

  who="$(gh_automation api user --jq '"\(.login) \(.id)"' 2>/dev/null)" ||
    die "couldn't ask GitHub who the automation account is - see \`config:ai-github status\`"
  login="${who% *}"
  id="${who#* }"

  personal="$(personal_github_login)"
  if [ -n "$personal" ] && [ "$login" = "$personal" ]
  then
    die "$AI_GITHUB_DIR is logged in as $personal - your personal account. run \`config:ai-github login\` again with the automation account"
  fi

  say "Claude Code will act as $login on GitHub, outside work sessions"

  # The bot's own keys, if 1Password has them. A missing one fails the run, so
  # setup.sh flags it, but still writes everything with the fallback for it -
  # no fragment at all would leave agents committing and pushing as me.
  signer="$(resolve_op_ssh_sign || true)"
  sock="$(op_agent_sock)"
  if [ -z "$signer" ]
  then
    say "1Password isn't installed here, so agents' commits go unsigned, and GitHub SSH remotes over HTTPS"
  elif [ -z "$sock" ]
  then
    warn "1Password's SSH agent isn't running - turn it on in 1Password > Settings > Developer and run apply again. until then agents' commits go unsigned, and GitHub SSH remotes over HTTPS"
    failed=1
  else
    signing="$(op_github_key "$sock" "$login" ssh_signing_keys)"
    auth="$(op_github_key "$sock" "$login" keys)"

    if [ -n "$signing" ]
    then
      say "agents will sign commits with \"${signing#* * }\" from 1Password"
    else
      warn "the 1Password agent has none of $login's signing keys, so agents' commits go unsigned. is 1Password unlocked, and is the key in a vault the SSH agent uses? new key: add it to 1Password, then at https://github.com/settings/ssh/new as a Signing Key, signed in as $login. then run apply again"
      failed=1
    fi

    if [ -n "$auth" ]
    then
      say "agents will use SSH with \"${auth#* * }\" from 1Password, and push HTTPS remotes over it too"
    else
      warn "the 1Password agent has none of $login's authentication keys, so agents send GitHub SSH remotes over HTTPS. is 1Password unlocked, and is the key in a vault the SSH agent uses? new key: add it to 1Password, then at https://github.com/settings/ssh/new as an Authentication Key, signed in as $login. then run apply again"
      failed=1
    fi
  fi

  write_top_gitconfigs || die "couldn't write $AI_AGENTS_DIR's gitconfigs"
  write_public_key "$signing" "$AI_GITHUB_SIGNING_KEY" || die "couldn't write $AI_GITHUB_SIGNING_KEY"
  write_public_key "$auth" "$AI_GITHUB_AUTH_KEY" || die "couldn't write $AI_GITHUB_AUTH_KEY"
  if [ -n "$auth" ]
  then
    write_github_ssh "$sock" || die "couldn't write $AI_SSH_CONFIG"
  else
    rm -f "$AI_SSH_CONFIG"
  fi
  write_github_gitconfig "$login" "$id" "$(command -v gh)" "$signing" "$signer" "$auth" || die "couldn't write the GitHub git config"

  with_github_env wire claude-outside set || failed=1
  wire claude-work set "GIT_CONFIG_GLOBAL=$AI_GITCONFIG_WITHOUT_GITHUB" || failed=1
  restart_note
  return "$failed"
}

# --- Tangled -----------------------------------------------------------------

# usage: with_tangled_env <did> <command> [args...]
#
# The same as with_github_env, with Tangled's pairs, which every agent gets.
with_tangled_env() {
  local did="$1"
  shift
  "$@" "TG_ACCOUNT=$did" "TG_PROTOCOL=https"
}

cmd_tangled_login() {
  local previous bot

  need tg
  need python3

  previous="$(tangled_did active)"

  say "logging in $AI_TANGLED_HANDLE. if a browser opens, it's $AI_TANGLED_HANDLE's PDS asking for that account's password - not yours"
  # TG_ACCOUNT because tg confirms the login by reading back the selected
  # account's session, and config.toml selects mine, which may not be logged in
  env -u TG_PROTOCOL -u GIT_CONFIG_GLOBAL TG_ACCOUNT="$AI_TANGLED_HANDLE" \
    tg auth login "$AI_TANGLED_HANDLE" "$@" || die "tg auth login failed"

  bot="$(tangled_did "$AI_TANGLED_HANDLE")"
  [ -n "$bot" ] || die "tg doesn't list $AI_TANGLED_HANDLE after logging in - see \`tg auth list\`"

  # Logging in makes that account tg's default. Hand the default back; the
  # agents pick the bot with TG_ACCOUNT. configs/tg/config.toml pins my account
  # anyway, but a machine without it falls back to the default.
  if [ -n "$previous" ] && [ "$previous" != "$bot" ]
  then
    tg_personal auth switch "$previous" >/dev/null ||
      warn "couldn't make $previous tg's default again - run \`tg auth switch <your handle>\`"
  fi

  cmd_tangled_apply
}

cmd_tangled_apply() {
  local did terminal failed=0

  need tg
  need git
  need python3

  did="$(tangled_did "$AI_TANGLED_HANDLE")"
  if [ -z "$did" ]
  then
    warn "$AI_TANGLED_HANDLE isn't logged in to tg - run \`config:ai-tangled login\` first"
    return 2
  fi

  terminal="$(tangled_terminal_account)"
  if [ "$did" = "${terminal%% *}" ]
  then
    warn "tg in your terminal is acting as $AI_TANGLED_HANDLE too - log your own account in with \`tg auth login <your handle>\`, or pin it in ~/.config/tg/config.toml"
  fi

  say "agents will act as $AI_TANGLED_HANDLE ($did) on Tangled"
  write_top_gitconfigs || die "couldn't write $AI_AGENTS_DIR's gitconfigs"
  write_tangled_gitconfig "$AI_TANGLED_HANDLE" "$did" "$(command -v tg)" || die "couldn't write the Tangled git config"

  with_tangled_env "$did" wire claude-outside set "GIT_CONFIG_GLOBAL=$AI_GITCONFIG" || failed=1
  with_tangled_env "$did" wire claude-work set "GIT_CONFIG_GLOBAL=$AI_GITCONFIG_WITHOUT_GITHUB" || failed=1
  with_tangled_env "$did" wire codex set "GIT_CONFIG_GLOBAL=$AI_GITCONFIG_WITHOUT_GITHUB" || failed=1
  restart_note
  return "$failed"
}

# --- both --------------------------------------------------------------------

# Undoes apply for $FORGE: the agents' variables, then its files. The login
# stays.
unwire() {
  local outside work="" codex="" other last="" failed=0

  need python3

  case "$FORGE" in
    github)
      outside="GH_CONFIG_DIR="
      other="$AI_AGENTS_DIR/tangled.gitconfig"
      ;;
    tangled)
      outside="TG_ACCOUNT= TG_PROTOCOL="
      work="$outside"
      # Codex is only ever on the Tangled bot
      codex="$outside GIT_CONFIG_GLOBAL="
      other="$AI_AGENTS_DIR/github.gitconfig"
      ;;
  esac

  # Claude Code's GIT_CONFIG_GLOBAL is shared, so it only goes with the last
  # forge
  if [ ! -f "$other" ]
  then
    outside="$outside GIT_CONFIG_GLOBAL="
    work="$work GIT_CONFIG_GLOBAL="
    last=1
  fi

  # Unwire before deleting anything - the reverse of apply - so a failed edit
  # can't leave GIT_CONFIG_GLOBAL pointing at a file that's gone.
  # shellcheck disable=SC2086 # word splitting is the point
  {
    wire claude-outside remove $outside || failed=1
    if [ -n "$work" ]; then wire claude-work remove $work || failed=1; fi
    if [ -n "$codex" ]; then wire codex remove $codex || failed=1; fi
  }
  restart_note
  [ "$failed" = 0 ] || return 1

  case "$FORGE" in
    github) rm -f "$AI_AGENTS_DIR/github.gitconfig" "$AI_SSH_CONFIG" "$AI_GITHUB_AUTH_KEY" "$AI_GITHUB_SIGNING_KEY" ;;
    tangled) rm -f "$AI_AGENTS_DIR/tangled.gitconfig" "$AI_AGENTS_DIR/tangled-identity.gitconfig" ;;
  esac
  if [ -n "$last" ]
  then
    rm -f "$AI_GITCONFIG" "$AI_GITCONFIG_WITHOUT_GITHUB"
  fi
}

cmd_remove() {
  unwire || return 1

  # not managed at all now, so a later apply or login should wire it again
  [ "$FORGE" = github ] && rm -f "$AI_GITHUB_OFF"

  case "$FORGE" in
    github) say "the automation account is still logged in at $AI_GITHUB_DIR - \`GH_CONFIG_DIR=$AI_GITHUB_DIR gh auth logout\` drops it" ;;
    tangled) say "$AI_TANGLED_HANDLE is still logged in to tg - \`tg auth logout --account $AI_TANGLED_HANDLE\` drops it" ;;
  esac
}

# Flips Claude Code outside work sessions between the automation account and
# mine on GitHub. Off is unwire plus a marker file, so apply - setup.sh's
# included - keeps it off rather than quietly switching back.
cmd_github_toggle() {
  local personal

  if [ -f "$AI_GITHUB_OFF" ]
  then
    rm -f "$AI_GITHUB_OFF"
    cmd_github_apply
    return
  fi

  mkdir -p "$AI_AGENTS_DIR" && : > "$AI_GITHUB_OFF" || die "couldn't write $AI_GITHUB_OFF"
  unwire || return 1

  personal="$(personal_github_login)"
  say "Claude Code will act as ${personal:-your own account} on GitHub - \`toggle:ai-github\` switches it back to the automation account"
}

row() {
  printf '  %-14s %s\n' "$1" "$2"
}

# usage: identity <gitconfig fragment>
identity() {
  [ -f "$1" ] || return 0
  printf '%s <%s>' "$(git config --file "$1" --get user.name)" "$(git config --file "$1" --get user.email)"
}

# usage: key_summary <public key file>
#
# "<1Password item title> (<fingerprint>)" - 1Password's agent gives each key
# its item's title as the comment, and apply keeps that in the file.
key_summary() {
  printf '%s (%s)' "$(cut -d ' ' -f 3- "$1")" "$(ssh-keygen -lf "$1" 2>/dev/null | cut -d ' ' -f 2)"
}

cmd_status() {
  local personal automation="" did="" work=""

  echo "GitHub"
  if command -v gh >/dev/null 2>&1
  then
    personal="$(personal_github_login)"
    if github_logged_in
    then
      automation="$(gh_automation api user --jq .login 2>/dev/null || echo "logged in, but GitHub rejected the token")"
    fi
    row "terminal" "${personal:-not logged in}"
    if [ -f "$AI_GITHUB_OFF" ]
    then
      row "Claude Code" "${personal:-not logged in} too - toggled off, toggle:ai-github switches it to ${automation:-the automation account}"
    else
      [ -f "$CLAUTH_DIR/profiles/$CLAUTH_WORK_PROFILE/config.toml" ] &&
        work=", except work sessions (clauth's $CLAUTH_WORK_PROFILE profile), which are ${personal:-yours}"
      row "Claude Code" "${automation:-not logged in - config:ai-github login}$work"
    fi
    row "Codex" "${personal:-not logged in}"
    row "agents' git" "$(identity "$AI_AGENTS_DIR/github.gitconfig")"
    if [ -f "$AI_GITHUB_SIGNING_KEY" ]
    then
      row "signs with" "$(key_summary "$AI_GITHUB_SIGNING_KEY")"
    elif [ -f "$AI_AGENTS_DIR/github.gitconfig" ]
    then
      row "signs with" "nothing - unsigned"
    fi
    if [ -f "$AI_GITHUB_AUTH_KEY" ]
    then
      row "SSH with" "$(key_summary "$AI_GITHUB_AUTH_KEY")"
    elif [ -f "$AI_AGENTS_DIR/github.gitconfig" ]
    then
      row "SSH with" "nothing - SSH remotes go over HTTPS"
    fi
  else
    row "gh" "not installed"
  fi

  echo "Tangled"
  if command -v tg >/dev/null 2>&1 && command -v python3 >/dev/null 2>&1
  then
    personal="$(tangled_terminal_account)"
    did="$(tangled_did "$AI_TANGLED_HANDLE")"
    if [ -n "$personal" ]
    then
      row "terminal" "${personal#* } (${personal%% *})"
    else
      row "terminal" "not logged in - tg auth login <your handle>"
    fi
    if [ -n "$did" ]
    then
      row "agents" "$AI_TANGLED_HANDLE ($did)"
    else
      row "agents" "not logged in - config:ai-tangled login"
    fi
    row "agents' git" "$(identity "$AI_AGENTS_DIR/tangled-identity.gitconfig")"
  else
    row "tg" "not installed"
  fi

  if command -v python3 >/dev/null 2>&1
  then
    printf '%-16s GitHub: %s / Tangled: %s\n' "Claude Code" \
      "$(with_github_env wire claude-outside check)" \
      "$(if [ -n "$did" ]; then with_tangled_env "$did" wire claude-outside check "GIT_CONFIG_GLOBAL=$AI_GITCONFIG"; else echo "not wired"; fi)"
    printf '%-16s Tangled: %s\n' "Codex" \
      "$(if [ -n "$did" ]; then with_tangled_env "$did" wire codex check "GIT_CONFIG_GLOBAL=$AI_GITCONFIG_WITHOUT_GITHUB"; else echo "not wired"; fi)"
  fi

  if [ -n "${GH_TOKEN:-}${GITHUB_TOKEN:-}" ]
  then
    warn "GH_TOKEN or GITHUB_TOKEN is set in this shell. gh prefers it over any config directory, so an agent started from here acts as whoever owns that token"
  fi
}

usage() {
  cat >&2 <<'EOF'
usage: config:ai-github  <login|apply|status|remove|toggle>
       config:ai-tangled <login|apply|status|remove>

  login [flags]   log the forge's automation account in, then apply
                    github:  gh auth login flags, e.g. --with-token < token.txt
                    tangled: tg auth login flags, e.g. --password-stdin < app-password.txt
  apply           point the agents at it: GitHub's is for Claude Code outside
                  work sessions, Tangled's for Claude Code and Codex
  status          which accounts the terminal and the agents use, on both forges
  remove          undo apply for this forge (the login stays)
  toggle          github only: switch Claude Code between the automation
                  account and yours (also toggle:ai-github)
EOF
  exit 64
}

FORGE="${1:-}"
case "$FORGE" in
  github|tangled) ;;
  *) usage ;;
esac

case "${2:-}" in
  login)  shift 2; "cmd_${FORGE}_login" "$@" ;;
  apply)  "cmd_${FORGE}_apply" ;;
  status) cmd_status ;;
  remove) cmd_remove ;;
  toggle) [ "$FORGE" = github ] || usage; cmd_github_toggle ;;
  *)      usage ;;
esac

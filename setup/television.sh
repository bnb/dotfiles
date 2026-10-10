#!/usr/bin/env bash
# shellcheck shell=bash
#
# Television (https://television.run), the display my agents put things on:
# the `tv` CLI, its agent skills, and its server as a login service, following
# https://television.run/install.md. Normally reached from macos.sh and
# linux.sh, but running this directly sets up (or repairs) just Television.

set -uo pipefail

if [ -z "${DOTFILES_COMMON_SOURCED:-}" ]
then
  DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  export DOTFILES_DIR
  # shellcheck source=setup/lib/common.sh
  . "$DOTFILES_DIR/setup/lib/common.sh"
fi

# The service keeps the PATH it was installed with. fnm's per-shell PATH entry
# disappears when that shell exits, so the service gets the stable entry of
# whichever node manager has a node new enough (22.12): fnm's default alias, or
# asdf's shims. Prints that directory, or returns 1 if there isn't one.
television_node_dir() {
  local dir

  for dir in "${FNM_DIR:-${XDG_DATA_HOME:-$HOME/.local/share}/fnm}/aliases/default/bin" "${ASDF_DATA_DIR:-$HOME/.asdf}/shims"
  do
    [ -x "$dir/node" ] || continue
    if "$dir/node" -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major > 22 || (major === 22 && minor >= 12) ? 0 : 1)' 2>/dev/null
    then
      printf '%s\n' "$dir"
      return 0
    fi
  done
  return 1
}

# usage: codex_writes_television_artifacts ~/.television/artifacts
#
# Codex's sandbox only writes inside the workspace, and Television's skills put
# HTML artifacts in <home>/artifacts. So Codex's default permissions become a
# profile that is its own :workspace plus that one directory. Edited line by
# line and checked the same way as automation-accounts.sh's edit_env, since the
# Codex app rewrites config.toml itself. A config that already picks its own
# sandbox is left alone, with the lines to add printed instead.
codex_writes_television_artifacts() {
  PYTHONPATH="$DOTFILES_DIR/setup/lib${PYTHONPATH:+:$PYTHONPATH}" PYTHONDONTWRITEBYTECODE=1 \
    python3 - "${CODEX_HOME:-$HOME/.codex}/config.toml" "$1" <<'PY'
import json, re, sys
from config_file import read, write

try:
    import tomllib
except ImportError:
    try:
        import tomli as tomllib
    except ImportError:
        tomllib = None

path, artifacts = sys.argv[1:]
KEY = 'default_permissions = "television"  # github.com/bnb/dotfiles setup/television.sh\n'
TABLES = '\n[permissions.television]\nextends = ":workspace"\n\n[permissions.television.filesystem]\n%s = "write"\n' % json.dumps(artifacts)
BY_HAND = "add this to it by hand, with the first line above any [table]:\n\n%s%s" % (KEY, TABLES)

text = read(path)
if tomllib is None:
    sys.stderr.write("no TOML parser here (needs python 3.11+), so %s can't be edited safely - skipping it.\n%s" % (path, BY_HAND))
    sys.exit(0)
try:
    old = tomllib.loads(text)
except tomllib.TOMLDecodeError as e:
    sys.exit("%s isn't valid TOML (%s) - leaving it alone" % (path, e))

profiles = old.get("permissions", {})
if old.get("default_permissions") == "television" and profiles.get("television", {}).get("filesystem", {}).get(artifacts) == "write":
    print("already set: %s" % path)
    sys.exit(0)
if "default_permissions" in old or "sandbox_mode" in old or "television" in profiles:
    sys.exit("%s already picks its own sandbox - leaving it alone.\n%s" % (path, BY_HAND))

# a top-level key has to come before the first table
lines = text.splitlines(True)
if lines and not lines[-1].endswith("\n"):
    lines[-1] += "\n"
first = next((i for i, l in enumerate(lines) if re.match(r"\s*\[", l)), len(lines))
new = "".join(lines[:first] + [KEY, "\n"] + lines[first:]) + TABLES

try:
    doc = tomllib.loads(new)
except tomllib.TOMLDecodeError:
    doc = None
profile = {"extends": ":workspace", "filesystem": {artifacts: "write"}}
ours = doc and doc.pop("default_permissions", None) == "television" and doc.get("permissions", {}).pop("television", None) == profile
if doc is not None and not doc.get("permissions"):
    doc.pop("permissions", None)
if not ours or doc != old:
    sys.exit("couldn't edit %s without touching anything else - leaving it alone.\n%s" % (path, BY_HAND))
write(path, new)
print("updated %s" % path)
PY
}

setup_television() {
  local node_dir service_path tv status home installed running skill link

  log_step "setting up Television"

  if ! node_dir="$(television_node_dir)"
  then
    record_failure "Television needs node 22.12 or later as fnm's default or from asdf - install one and re-run"
    return 1
  fi

  # a pnpm global, like PNPM_GLOBALS, so it survives switching node versions
  local -x PATH="$node_dir:$PATH"
  pnpm_global_install_batch @telepath-computer/television
  tv="${PNPM_HOME:-}/bin/tv"
  if [ ! -x "$tv" ]
  then
    record_failure "tv isn't installed - skipping the Television skills and service"
    return 1
  fi
  service_path="$PNPM_HOME/bin:$node_dir:/usr/bin:/bin:/usr/sbin:/sbin"

  # Reinstalled every run, since they change with each release. Codex reads
  # ~/.agents/skills as is, and Claude Code gets the same relative symlinks the
  # Skills CLI makes.
  if ! "$tv" skills install "$HOME/.agents/skills"
  then
    record_failure "tv skills install"
  fi
  mkdir -p "$HOME/.claude/skills"
  for skill in "$HOME/.agents/skills/television" "$HOME/.agents/skills"/tv-*
  do
    [ -d "$skill" ] || continue
    link="$HOME/.claude/skills/$(basename "$skill")"
    if [ -e "$link" ] && [ ! -L "$link" ]
    then
      log_warn "$link isn't a symlink - leaving it alone"
      continue
    fi
    ln -sfn "../../.agents/skills/$(basename "$skill")" "$link"
  done

  status="$("$tv" status 2>/dev/null || true)"
  home="$(printf '%s' "$status" | node -p 'JSON.parse(require("fs").readFileSync(0, "utf8")).home' 2>/dev/null || true)"

  # Codex's sandbox blocks localhost and writes outside the workspace, so its
  # rules let the everyday `tv` commands out, and its permissions let it write
  # artifacts. Claude Code runs no sandbox here, so it needs neither.
  link_dotfile configs/ai/codex-television.rules "${CODEX_HOME:-$HOME/.codex}/rules/television.rules" || true
  if [ -n "$home" ] && mkdir -p "$home/artifacts"
  then
    codex_writes_television_artifacts "$home/artifacts" || record_failure "couldn't let Codex write Television artifacts"
  else
    record_failure "couldn't find Television's home - skipping Codex's write access to its artifacts"
  fi

  # `tv serve --persist` replaces and restarts the service, so it only runs
  # when the service isn't already healthy on the installed version.
  installed="$("$tv" --version | cut -d' ' -f1)"
  running="$(printf '%s' "$status" | node -p 'const s = JSON.parse(require("fs").readFileSync(0, "utf8")); s.healthy && s.daemon.running ? s.version : ""' 2>/dev/null || true)"
  if [ "$running" = "$installed" ]
  then
    log_info "the Television service is already running $installed"
    return 0
  fi

  if ! PATH="$service_path" "$tv" serve --persist
  then
    record_failure "couldn't start the Television service - see ~/.television/logs/tv.log"
    return 1
  fi
  log_info "the Television service is running - \`tv links\` prints the link for the app or a browser"
}

setup_television || true

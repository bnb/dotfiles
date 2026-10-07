#!/usr/bin/env bash
# shellcheck shell=bash
#
# Claude in VS Code runs through this: setup.sh makes it the extension's
# claudeCode.claudeProcessWrapper. The extension calls it with the claude it
# bundles as $1, then claude's own args.
#
# VS Code is for work and the Claude desktop app is for personal work, but
# both run Claude Code against ~/.claude, and Claude Code trusts the account
# identity cached in ~/.claude.json over the one it's signed in with. So this
# starts claude through `clauth start work`, which gives each session the work
# profile's credentials and its own copy of ~/.claude.json, and leaves
# ~/.claude to the desktop app. claude-work-settings.json adds the settings
# only work sessions should get.

claude=$1
shift

# clauth runs whichever `claude` is first on PATH, so put the bundled one there
PATH="$(dirname "$claude"):$PATH" exec "${CARGO_HOME:-$HOME/.cargo}/bin/clauth" start work -- \
  --settings "$(dirname "$0")/claude-work-settings.json" "$@"

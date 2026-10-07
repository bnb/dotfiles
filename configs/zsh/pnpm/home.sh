# shellcheck shell=bash
#
# $PNPM_HOME, unless it's already set. These are pnpm's own defaults, so an
# existing global install stays where it is. Shared by pnpm.sh and
# setup/lib/common.sh, so it has to work in zsh and in bash 3.2 under `set -u`.
if [ -z "${PNPM_HOME:-}" ]
then
  if [ -n "${XDG_DATA_HOME:-}" ]
  then
    PNPM_HOME="$XDG_DATA_HOME/pnpm"
  else
    case "$OSTYPE" in
      darwin*) PNPM_HOME="$HOME/Library/pnpm" ;;
      *)       PNPM_HOME="$HOME/.local/share/pnpm" ;;
    esac
  fi
fi
export PNPM_HOME

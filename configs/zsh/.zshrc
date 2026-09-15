# Environemnt Variables - set these up in the `.zshrc` that imports this `.zshrc`:
#
# Every flag below is off unless it's set to `true` (`1`/`yes`/`on` also work).
# Setting one to `false` turns it off.
#
# Only one node version manager is ever loaded, even if several are `true`:
# nvm wins over fnm, and fnm wins over asdf.
#
#  $PERSONAL_DOTFILES_PATH: path to my personal dotfiles repo
#  $PERSONAL_SETUP_MACOSBREW: if this is a macOS machine you want to use homebrew on, set this to `true`
#  $PERSONAL_SETUP_LINUXBREW: if this is a machine you want to use linuxbrew on, set this to `true`
#  $PERSONAL_SETUP_MACOS: if this is a macOS machine, set to `true`
#  $PERSONAL_SETUP_NVM: if you'd like to include the shell scripts that make nvm work, set to `true`
#  $PERSONAL_SETUP_FNM: if you'd like to include the shell scripts that make fnm work, set to `true`
#  $PERSONAL_SETUP_ASDF: if you'd like to include the shell scripts that make asdf work, set to `true`
#  $PERSONAL_SETUP_STARSHIP: if using starship.rs, set to `true`
#  $PERSONAL_SETUP_WORK: if this is a work machine, set to `true`
#  $PERSONAL_SETUP_ZSHPLUGINS: if you want to enable my personal plugin config, set to `true`
#  $PERSONAL_SETUP_DEBUG: to print what's being set up as it happens, set to `true`

# Work out where this repo lives from the file being sourced, rather than
# trusting $PERSONAL_DOTFILES_PATH. Resolved once and reused: calling
# $(dirname "$0") on every source line cost ~20ms of startup on its own.
if [ -n "$ZSH_VERSION" ]
then
  PERSONAL_ZSH_DIR="${0:A:h}"
else
  PERSONAL_ZSH_DIR="$(cd "$(dirname "$0")" && pwd)"
fi

# $PERSONAL_DOTFILES_PATH is still honoured, but fix it up first: setting it
# in single quotes (`'~/GitHub/bnb/dotfiles'`) leaves a literal tilde that
# never expands, which quietly breaks every path built from it.
case "$PERSONAL_DOTFILES_PATH" in
  "~/"*) PERSONAL_DOTFILES_PATH="$HOME${PERSONAL_DOTFILES_PATH#\~}" ;;
  "")    PERSONAL_DOTFILES_PATH="${PERSONAL_ZSH_DIR%/configs/zsh}" ;;
esac
export PERSONAL_DOTFILES_PATH

# helpers first - everything below (and every file sourced below) uses them
source "$PERSONAL_ZSH_DIR/general/helpers.sh"

__personal_debug "setting up general"

source "$PERSONAL_ZSH_DIR/general/aliases.sh"
source "$PERSONAL_ZSH_DIR/general/correction.sh"
source "$PERSONAL_ZSH_DIR/general/language.sh"
source "$PERSONAL_ZSH_DIR/general/sshKeyPath.sh"
source "$PERSONAL_ZSH_DIR/general/variables.sh"

# check if $PERSONAL_SETUP_MACOS is true and if so, set up the macOS paths
if __personal_enabled "$PERSONAL_SETUP_MACOS"
then
  __personal_debug "setting up macOS"
  source "$PERSONAL_ZSH_DIR/macos/pathExports.sh"
fi

# check if $PERSONAL_SETUP_MACOSBREW is true and if so, eval homebrew
if __personal_enabled "$PERSONAL_SETUP_MACOSBREW"
then
  __personal_debug "setting up homebrew"
  source "$PERSONAL_ZSH_DIR/homebrew/macos.sh"
fi

# check if $PERSONAL_SETUP_LINUXBREW is true and if so, eval linuxbrew
if __personal_enabled "$PERSONAL_SETUP_LINUXBREW"
then
  __personal_debug "setting up linuxbrew"
  source "$PERSONAL_ZSH_DIR/homebrew/linux.sh"
fi

# node version managers - nvm, fnm, and asdf all want to own $PATH, so only
# one of them is allowed to load. If more than one is enabled, the first in
# this list wins: nvm, then fnm, then asdf.
__personal_node_enabled=""
__personal_enabled "$PERSONAL_SETUP_NVM"  && __personal_node_enabled="$__personal_node_enabled nvm"
__personal_enabled "$PERSONAL_SETUP_FNM"  && __personal_node_enabled="$__personal_node_enabled fnm"
__personal_enabled "$PERSONAL_SETUP_ASDF" && __personal_node_enabled="$__personal_node_enabled asdf"
__personal_node_enabled="${__personal_node_enabled# }"   # drop the leading space
__personal_node_manager="${__personal_node_enabled%% *}" # first one enabled wins

if [ -n "$__personal_node_manager" ]
then
  case "$__personal_node_enabled" in
    *\ *) __personal_debug "more than one node version manager is enabled ($__personal_node_enabled) - using $__personal_node_manager and ignoring the rest" ;;
  esac
  __personal_debug "setting up $__personal_node_manager"
  source "$PERSONAL_ZSH_DIR/node/$__personal_node_manager.sh"
fi

unset __personal_node_enabled __personal_node_manager

# check if $PERSONAL_SETUP_STARSHIP is true and if so, set up starship init file
if __personal_enabled "$PERSONAL_SETUP_STARSHIP"
then
  __personal_debug "setting up starship"
  source "$PERSONAL_ZSH_DIR/starship/init.sh"
fi

# check if $PERSONAL_SETUP_ZSHPLUGINS is true and if so, set up my plugin config
if __personal_enabled "$PERSONAL_SETUP_ZSHPLUGINS"
then
  if [ -f "$PERSONAL_ZSH_DIR/plugins/init.sh" ]
  then
    __personal_debug "setting up zsh plugins"
    source "$PERSONAL_ZSH_DIR/plugins/init.sh"
  else
    __personal_debug "skipping zsh plugins: configs/zsh/plugins/init.sh doesn't exist"
  fi
fi

# check if $PERSONAL_SETUP_WORK and $PERSONAL_SETUP_MACOS are both true and if so, load the work aliases
if __personal_enabled "$PERSONAL_SETUP_WORK" && __personal_enabled "$PERSONAL_SETUP_MACOS"
then
  if [ -f "$PERSONAL_ZSH_DIR/work/aliases.sh" ]
  then
    __personal_debug "setting up work"
    source "$PERSONAL_ZSH_DIR/work/aliases.sh"
  else
    __personal_debug "skipping work: configs/zsh/work/aliases.sh doesn't exist"
  fi
fi

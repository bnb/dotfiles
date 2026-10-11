# Environment Variables - set these up in the `.zshrc` that imports this `.zshrc`:
#
# Every flag below is off unless it's set to `true` (`1`/`yes`/`on` also work).
# Setting one to `false` turns it off.
#
# Only one node version manager is ever loaded, even if several are `true`:
# nvm wins over fnm, and fnm wins over asdf.
#
#  $PERSONAL_DOTFILES_PATH: path to my personal dotfiles repo
#  $PERSONAL_SETUP_MACOSBREW / $PERSONAL_SETUP_LINUXBREW: to use homebrew, set either one to `true` (they do the same thing)
#  $PERSONAL_SETUP_MACOS: if this is a macOS machine, set to `true`
#  $PERSONAL_SETUP_NVM: if you'd like to include the shell scripts that make nvm work, set to `true`
#  $PERSONAL_SETUP_FNM: if you'd like to include the shell scripts that make fnm work, set to `true`
#  $PERSONAL_SETUP_ASDF: if you'd like to include the shell scripts that make asdf work, set to `true`
#  $PERSONAL_SETUP_STARSHIP: if using starship.rs, set to `true`
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

# zsh keeps the $path array and $PATH in sync; -U makes both drop duplicates as
# they're added, keeping the first. Re-sourcing can't stack the same directory
# up, and a file below can move a directory forward by adding it again.
typeset -U path PATH

__personal_debug "setting up general"

source "$PERSONAL_ZSH_DIR/general/aliases.sh"
source "$PERSONAL_ZSH_DIR/general/correction.sh"
source "$PERSONAL_ZSH_DIR/general/language.sh"
source "$PERSONAL_ZSH_DIR/general/variables.sh"

# check if $PERSONAL_SETUP_MACOSBREW or $PERSONAL_SETUP_LINUXBREW is true and if so, set up homebrew
if __personal_enabled "$PERSONAL_SETUP_MACOSBREW" || __personal_enabled "$PERSONAL_SETUP_LINUXBREW"
then
  __personal_debug "setting up homebrew"
  source "$PERSONAL_ZSH_DIR/homebrew/init.sh"
fi

# cargo-installed binaries (clauth). Unflagged, and after homebrew so a crate
# installed with cargo wins over a brew formula of the same name.
source "$PERSONAL_ZSH_DIR/rust/cargo.sh"

# pnpm global installs (Yarn 4 is one of them). Unflagged, and after homebrew
# for the same reason as cargo.
source "$PERSONAL_ZSH_DIR/pnpm/pnpm.sh"

# check if $PERSONAL_SETUP_MACOS is true and if so, set up the macOS paths.
# After homebrew: `brew shellenv` puts brew's directories at the very front of
# $PATH, so running it after this would push ~/.local/bin and ~/bin behind them.
# After cargo and pnpm too, so it can slot their directories in between
# ~/bin and brew's rather than leaving them in front of ~/.local/bin.
if __personal_enabled "$PERSONAL_SETUP_MACOS"
then
  __personal_debug "setting up macOS"
  source "$PERSONAL_ZSH_DIR/macos/pathExports.sh"
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

# completions. The system zshrc (Ubuntu's does) may have run compinit already,
# so only run it if nothing has - macOS's doesn't, which left every shell there
# with no completions at all. After homebrew, because
# `brew shellenv` adds brew's site-functions to $fpath. -i skips insecure
# directories rather than stopping the shell to ask about them.
#
# The full check (compaudit's walk of $fpath, plus looking for new completion
# functions) runs at most once a day; otherwise -C trusts the dump. Delete
# ~/.zcompdump to pick up a newly installed completion straight away.
if (( ! $+functions[compdef] ))
then
  __personal_debug "running compinit"
  autoload -Uz compinit
  __personal_zcompdump=(${ZDOTDIR:-$HOME}/.zcompdump(N.mh-24))
  if (( $#__personal_zcompdump ))
  then
    compinit -i -C
  else
    compinit -i
    # compinit only rewrites the dump when something changed, so mark it
    # checked or every shell after the first day would do the full check
    touch "${ZDOTDIR:-$HOME}/.zcompdump"
  fi

  # compinit sources the dump, and zsh's `source` reads file.zwc in place of
  # file whenever the .zwc is newer - so keep a compiled copy current. In the
  # background, so it never holds up the prompt.
  __personal_zcompdump="${ZDOTDIR:-$HOME}/.zcompdump"
  if [[ -s "$__personal_zcompdump" && ( ! -s "$__personal_zcompdump.zwc" || "$__personal_zcompdump" -nt "$__personal_zcompdump.zwc" ) ]]
  then
    zcompile "$__personal_zcompdump" &!
  fi
  unset __personal_zcompdump
fi

# clauth and tg completions. Unflagged, and after compinit because they
# register themselves with compdef.
source "$PERSONAL_ZSH_DIR/clauth/completions.sh"
source "$PERSONAL_ZSH_DIR/tg/completions.sh"

# puts the Claude desktop app's own git on the agents' accounts. does nothing
# outside the app's one-off read of the login shell environment. last, so jq is
# on $PATH wherever it came from.
source "$PERSONAL_DOTFILES_PATH/configs/ai/claude-desktop-env.sh"

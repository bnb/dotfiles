# shellcheck shell=bash

if [ "${BASH_SOURCE[0]}" = "${0}" ]
then
  echo "setup/lib/common.sh is a library - source it, don't run it" >&2
  exit 1
fi

if [ -n "${DOTFILES_COMMON_SOURCED:-}" ]
then
  return 0
fi
DOTFILES_COMMON_SOURCED=1

# Directories
#
# These two trees are the ONE thing guaranteed to be consistent on every
# machine. Add a name to either array and it gets created on the next run.
#
# The roots honour $PERSONAL_GITHUB_DIR / $PERSONAL_TANGLED_DIR, with the same
# defaults as configs/zsh/general/variables.sh, so the `github` and `tangled`
# aliases always land where this run made the directories.
GITHUB_DIR="${PERSONAL_GITHUB_DIR:-$HOME/GitHub}"
TANGLED_DIR="${PERSONAL_TANGLED_DIR:-$HOME/tangled}"
GITHUB_ORGS=(bnb)
TANGLED_ORGS=(bnb.im)

# My work checkouts. Only a machine that has this directory gets the work keys
# and instructions (link_work_files).
WORK_DIR="$GITHUB_DIR/assistant-ui"

# $DOTFILES_DIR is the copy of the repo setup is running from. setup.sh,
# macos.sh and linux.sh set it before sourcing this.

# Logging
#
# An unattended run is only debuggable afterwards if it said what it was doing
# at the time, so every step announces itself with a timestamp.

_dotfiles_now() {
  date '+%H:%M:%S'
}

log_step() {
  printf '\n[%s] ==> %s\n' "$(_dotfiles_now)" "$*"
}

log_info() {
  printf '[%s]     %s\n' "$(_dotfiles_now)" "$*"
}

log_warn() {
  printf '[%s]  !  %s\n' "$(_dotfiles_now)" "$*" >&2
}

log_error() {
  printf '[%s] !!! %s\n' "$(_dotfiles_now)" "$*" >&2
}

# -----------------------------------------------------------------------------
# Failure collection
#
# The old step-2.sh had no `set -e`, so a bad package name scrolled past and
# the run "succeeded". The rule here is the opposite: nothing is swallowed, but
# one broken thing doesn't take the rest of the run with it either. Anything
# that fails is recorded, printed immediately, and printed again as a summary
# when the script exits.
# -----------------------------------------------------------------------------
DOTFILES_FAILURES=()

record_failure() {
  DOTFILES_FAILURES+=("$*")
  log_error "$*"
}

# always returns 0 - it reports, it doesn't decide anything
report_failures() {
  local failure

  if [ "${#DOTFILES_FAILURES[@]}" -eq 0 ]
  then
    log_step "all done - nothing failed"
    return 0
  fi

  log_step "finished, but ${#DOTFILES_FAILURES[@]} step(s) failed:"
  for failure in "${DOTFILES_FAILURES[@]}"
  do
    printf '      - %s\n' "$failure" >&2
  done
  printf '\n      re-running this script is safe: it picks up where it left off.\n\n' >&2
  return 0
}

# -----------------------------------------------------------------------------
# sudo
#
# softwareupdate, some casks, apt and chsh all want root. Asking once up front
# and keeping the timestamp warm is the difference between "unattended" and
# "sits there waiting for a password twenty minutes in".
# -----------------------------------------------------------------------------
DOTFILES_SUDO_READY=""
DOTFILES_SUDO_PID=""

sudo_ready() {
  [ -n "$DOTFILES_SUDO_READY" ]
}

request_sudo() {
  if sudo_ready
  then
    return 0
  fi

  if [ "$(id -u)" -eq 0 ]
  then
    log_info "running as root already - no sudo needed"
    DOTFILES_SUDO_READY=1
    return 0
  fi

  if ! command -v sudo >/dev/null 2>&1
  then
    log_warn "sudo isn't installed - the steps that need root will be skipped"
    return 1
  fi

  log_step "asking for sudo once, up front - the rest of the run is unattended"
  if ! sudo -v
  then
    log_warn "couldn't get sudo - the steps that need root will be skipped"
    return 1
  fi

  DOTFILES_SUDO_READY=1

  # Refresh the timestamp every 50s (the default grace period is 5 minutes) for
  # as long as this script is alive, and stop the moment it isn't.
  (
    while kill -0 "$$" 2>/dev/null
    do
      sudo -n true 2>/dev/null || exit 0
      sleep 50
    done
  ) &
  DOTFILES_SUDO_PID="$!"
  log_info "keeping the sudo timestamp warm in the background (pid $DOTFILES_SUDO_PID)"
  return 0
}

# usage: sudo_run softwareupdate --all --install
sudo_run() {
  if [ "$(id -u)" -eq 0 ]
  then
    "$@"
    return "$?"
  fi

  if ! sudo_ready
  then
    log_warn "skipping (no sudo): $*"
    return 1
  fi

  sudo "$@"
}

_dotfiles_stop_sudo_keepalive() {
  if [ -n "$DOTFILES_SUDO_PID" ]
  then
    kill "$DOTFILES_SUDO_PID" 2>/dev/null || true
    DOTFILES_SUDO_PID=""
  fi
}

# Exit handling
#
# Installed once, at source time, so the summary prints whether the script
# finished cleanly, exited early, or was interrupted.
_dotfiles_on_exit() {
  local status=$?

  _dotfiles_stop_sudo_keepalive
  report_failures

  # a clean exit with recorded failures is still a failed run
  if [ "$status" -eq 0 ] && [ "${#DOTFILES_FAILURES[@]}" -gt 0 ]
  then
    status=1
  fi

  exit "$status"
}

trap _dotfiles_on_exit EXIT

# Files

# usage: backup_path "$HOME/.zshrc"
#
# Never truncate or delete something the user already had. Moves it aside to
# <file>.backup.<YYYYmmddHHMMSS> and leaves the original path free.
backup_path() {
  local target="$1"
  local stamp backup suffix

  if [ ! -e "$target" ] && [ ! -L "$target" ]
  then
    return 0
  fi

  stamp="$(date '+%Y%m%d%H%M%S')"
  backup="$target.backup.$stamp"

  # two runs inside the same second shouldn't clobber each other's backup
  suffix=1
  while [ -e "$backup" ] || [ -L "$backup" ]
  do
    backup="$target.backup.$stamp-$suffix"
    suffix=$((suffix + 1))
  done

  log_info "backing up $target -> $backup"
  mv "$target" "$backup"
}

# usage: ensure_dir "$HOME/GitHub/bnb"
#
# Creates the directory if it's missing, then verifies it's really there and
# writable, since cloning into it is the next thing anyone does. Anything wrong
# is recorded, and a file or broken symlink already at that path is left alone.
ensure_dir() {
  local dir="$1"

  if [ -d "$dir" ]
  then
    log_info "already there: $dir"
  elif [ -e "$dir" ] || [ -L "$dir" ]
  then
    record_failure "$dir exists but isn't a directory - leaving it alone; move it aside and re-run"
    return 1
  else
    log_info "creating: $dir"
    mkdir -p "$dir"
  fi

  if [ ! -d "$dir" ]
  then
    record_failure "couldn't create $dir"
    return 1
  fi

  if [ ! -w "$dir" ]
  then
    record_failure "$dir isn't writable by $(id -un) - fix its ownership and re-run"
    return 1
  fi

  return 0
}

# usage: ensure_tree "$GITHUB_DIR" bnb
#
# The root is ensured on its own rather than left to the orgs' mkdir -p, so it
# exists (and the alias that cds into it works) even with no orgs listed. If
# the root is broken, its orgs are skipped instead of each failing again.
ensure_tree() {
  local root="$1"
  local org
  shift

  ensure_dir "$root" || return 1

  for org in "$@"
  do
    ensure_dir "$root/$org"
  done

  return 0
}

# $GITHUB_DIR/<org> and $TANGLED_DIR/<org> for every name in the arrays at the
# top, plus the roots themselves.
ensure_directory_invariant() {
  log_step "making sure the standard directories exist"

  ensure_tree "$GITHUB_DIR" ${GITHUB_ORGS[@]+"${GITHUB_ORGS[@]}"}
  ensure_tree "$TANGLED_DIR" ${TANGLED_ORGS[@]+"${TANGLED_ORGS[@]}"}
}

# Homebrew

# __PERSONAL_BREW_PREFIXES, shared with the shell's configs/zsh/general/helpers.sh
# shellcheck source=configs/zsh/homebrew/prefixes.sh
. "$(dirname "${BASH_SOURCE[0]}")/../../configs/zsh/homebrew/prefixes.sh"

# Prints the prefix on stdout, or returns 1 if brew isn't installed anywhere we
# know about. Never hardcode /opt/homebrew: that's apple silicon's prefix, and
# an intel mac puts brew in /usr/local.
resolve_brew_prefix() {
  local candidate

  for candidate in "${HOMEBREW_PREFIX:-}" "${__PERSONAL_BREW_PREFIXES[@]}"
  do
    if [ -n "$candidate" ] && [ -x "$candidate/bin/brew" ]
    then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  # last resort: whatever is already on $PATH
  if command -v brew >/dev/null 2>&1
  then
    brew --prefix
    return 0
  fi

  return 1
}

# Puts brew on $PATH for the rest of this script.
load_brew() {
  local prefix

  if ! prefix="$(resolve_brew_prefix)"
  then
    return 1
  fi

  log_info "using homebrew at $prefix"
  eval "$("$prefix/bin/brew" shellenv)"

  # quieter, and never stop to ask a question during an unattended run.
  # NO_ASK because Homebrew 7 asks "proceed? [y/n]" before every install by
  # default, and piped from curl there's nobody to answer - brew reads the
  # script's own stdin, gets garbage, and aborts the install.
  export HOMEBREW_NO_ENV_HINTS=1
  export HOMEBREW_NO_ASK=1
  return 0
}

ensure_homebrew() {
  local installer status

  log_step "checking for homebrew"

  if resolve_brew_prefix >/dev/null 2>&1
  then
    log_info "homebrew is already installed"
  else
    log_info "homebrew isn't installed - fetching the official installer"

    if ! installer="$(mktemp "${TMPDIR:-/tmp}/homebrew-install.XXXXXX")"
    then
      record_failure "couldn't create a temp file for the homebrew installer"
      return 1
    fi

    # Download first and check, *then* run. `bash -c "$(curl ...)"` runs an
    # empty string when curl fails, which looks exactly like success.
    if ! curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh -o "$installer"
    then
      rm -f "$installer"
      record_failure "couldn't download the homebrew installer"
      return 1
    fi

    log_info "running the homebrew installer (NONINTERACTIVE=1)"
    status=0
    NONINTERACTIVE=1 /bin/bash "$installer" || status=$?
    rm -f "$installer"

    if [ "$status" -ne 0 ]
    then
      record_failure "the homebrew installer exited $status"
      return 1
    fi
  fi

  if ! load_brew
  then
    record_failure "homebrew is installed but brew isn't where we expected it - set \$HOMEBREW_PREFIX and re-run"
    return 1
  fi

  return 0
}

# Third-party taps. A formula from one of these is listed by its full name
# (alyraffauf/tap/tg) so brew can't mistake it for something in homebrew/core.
# alyraffauf/tap is tg, the Tangled CLI the AI agents use (configs/ai).
BREW_TAPS="alyraffauf/tap"

# usage: brew_trust_taps alyraffauf/tap
#
# Always returns 0, same as brew_install_batch. Homebrew 7 won't load a formula
# from a non-official tap until the tap is trusted, so this has to run before
# the formulae. Older brews have no `brew trust` and don't need it.
brew_trust_taps() {
  local tapped tap

  if ! command -v brew >/dev/null 2>&1
  then
    record_failure "brew isn't available - skipping taps: $*"
    return 0
  fi

  tapped="$(brew tap 2>/dev/null || true)"

  for tap in "$@"
  do
    if ! printf '%s\n' "$tapped" | grep -Fxq "$tap"
    then
      log_step "brew tap $tap"
      if ! brew tap "$tap"
      then
        record_failure "brew tap $tap"
        continue
      fi
    fi

    if brew help trust >/dev/null 2>&1 && ! brew trust --tap "$tap"
    then
      record_failure "brew trust --tap $tap"
    fi
  done

  return 0
}

# usage: brew_install_batch --formula git gh starship
#        brew_install_batch --cask 1password arc
#
# Always returns 0: anything that fails is recorded and shows up in the summary,
# but one bad package must not abort the run. `--formula`/`--cask` is passed
# explicitly rather than letting brew guess, because guessing is how
# `brew install docker` quietly installed the CLI instead of Docker Desktop.
brew_install_batch() {
  local kind="$1"
  shift

  local installed pkg
  local pending=()

  if ! command -v brew >/dev/null 2>&1
  then
    record_failure "brew isn't available - skipping: $*"
    return 0
  fi

  # --full-name so a tap formula is listed as alyraffauf/tap/tg, the way it's
  # asked for
  installed="$(brew list "$kind" --full-name 2>/dev/null || true)"

  for pkg in "$@"
  do
    # An alias never matches by name (python3 is listed as python@3.x), so a
    # miss is asked about directly - one extra brew call per miss. Not when
    # nothing's installed at all, as on a fresh machine: there's nothing for
    # an alias to resolve to, and it would be a brew call per package.
    if printf '%s\n' "$installed" | grep -Fxq "$pkg" ||
      { [ -n "$installed" ] && brew list "$kind" "$pkg" >/dev/null 2>&1; }
    then
      log_info "already installed ($kind): $pkg"
    else
      pending+=("$pkg")
    fi
  done

  if [ "${#pending[@]}" -eq 0 ]
  then
    log_info "nothing new to install ($kind)"
    return 0
  fi

  log_step "brew install $kind: ${pending[*]}"

  if brew install "$kind" "${pending[@]}"
  then
    return 0
  fi

  # A batch install aborts as a whole on a bad name, so fall back to one at a
  # time to find out *which* one - and still install the good ones.
  log_warn "that batch failed - retrying one at a time so one bad package doesn't take the rest with it"

  for pkg in "${pending[@]}"
  do
    log_info "brew install $kind $pkg"
    if ! brew install "$kind" "$pkg"
    then
      record_failure "brew install $kind $pkg"
    fi
  done

  return 0
}

# Cargo
#
# Crates that aren't in homebrew. `rust` comes from brew on both platforms, so
# this has to run after the brew formulae. `cargo install` puts the binaries in
# ~/.cargo/bin, which configs/zsh/rust/cargo.sh adds to $PATH.
CARGO_CRATES="clauth"

# usage: cargo_install_batch clauth
#
# Always returns 0, same as brew_install_batch. One crate at a time rather than
# one `cargo install a b c`, so a failure is recorded against the crate that
# actually broke.
cargo_install_batch() {
  local installed crate

  if ! command -v cargo >/dev/null 2>&1
  then
    record_failure "cargo isn't available - skipping: $*"
    return 0
  fi

  # `cargo install --list` prints "<crate> v<version>:" and then one indented
  # line per binary
  installed="$(cargo install --list 2>/dev/null || true)"

  for crate in "$@"
  do
    if printf '%s\n' "$installed" | grep -q "^$crate v"
    then
      log_info "already installed (cargo): $crate"
      continue
    fi

    # It compiles from source, so this is the slow bit of the run. --locked
    # builds against the Cargo.lock the crate was published with, instead of
    # whatever dependency versions happen to resolve today.
    log_step "cargo install $crate"
    if ! cargo install --locked "$crate"
    then
      record_failure "cargo install $crate"
    fi
  done

  return 0
}

# pnpm globals
#
# Packages installed with `pnpm add -g` rather than brew. `@yarnpkg/cli-dist`
# is Yarn 4: brew only has Yarn 1, corepack is being dropped from Node.js, and
# `npm i -g` lives inside one node version and vanishes the moment fnm/nvm/asdf
# switches to another. pnpm's global directory doesn't belong to any node
# version, and its shims run whichever `node` is on $PATH. riftri is the CLI
# my agents make worktrees with (configs/ai/instructions.md).
PNPM_GLOBALS="@yarnpkg/cli-dist riftri"

# usage: pnpm_global_install_batch @yarnpkg/cli-dist
#
# Always returns 0, same as brew_install_batch. Has to run after the brew
# formulae, since pnpm comes from brew.
pnpm_global_install_batch() {
  local installed pkg

  if ! command -v pnpm >/dev/null 2>&1
  then
    record_failure "pnpm isn't available - skipping: $*"
    return 0
  fi

  # `pnpm add -g` refuses to run unless its bin directory is already on $PATH,
  # even before that directory exists. configs/zsh/pnpm/pnpm.sh does the same
  # for every shell afterwards.
  # shellcheck source=configs/zsh/pnpm/home.sh
  . "$DOTFILES_DIR/configs/zsh/pnpm/home.sh"
  PATH="$PNPM_HOME/bin:$PATH"

  # --parseable prints one path per package, ending in node_modules/<name>
  installed="$(pnpm ls -g --depth=0 --parseable 2>/dev/null || true)"

  for pkg in "$@"
  do
    if printf '%s\n' "$installed" | grep -q "/node_modules/$pkg\$"
    then
      log_info "already installed (pnpm -g): $pkg"
      continue
    fi

    log_step "pnpm add -g $pkg"
    if ! pnpm add -g "$pkg"
    then
      record_failure "pnpm add -g $pkg"
    fi
  done

  return 0
}

# Agent skills
#
# Skills for Claude Code and Codex, installed with the Skills CLI (skills.sh)
# through `pnpm dlx`, so this has to run after the pnpm globals. A global
# install keeps one copy in ~/.agents/skills, which Codex reads as is, and
# symlinks it into ~/.claude/skills. DO_NOT_TRACK turns off the CLI's telemetry
# and its third-party security-audit lookups.
AGENT_SKILLS="blader/humanizer dmmulroy/anti-slop assistant-ui/riftri"

# usage: agent_skills_install_batch blader/humanizer
#
# Always returns 0, same as brew_install_batch. A source that's already
# installed is skipped; `pnpm dlx skills update -g` is what updates them.
agent_skills_install_batch() {
  local installed src

  if ! command -v pnpm >/dev/null 2>&1
  then
    record_failure "pnpm isn't available - skipping skills: $*"
    return 0
  fi

  installed="$(DO_NOT_TRACK=1 pnpm dlx skills ls -g --json 2>/dev/null || true)"

  for src in "$@"
  do
    if printf '%s\n' "$installed" | grep -Fq "\"source\": \"$src\""
    then
      log_info "already installed (skills): $src"
      continue
    fi

    log_step "skills add $src"
    if ! DO_NOT_TRACK=1 pnpm dlx skills add "$src" --global --agent claude-code --agent codex --yes
    then
      record_failure "skills add $src"
    fi
  done

  return 0
}

# usage: install_packages "<formulae>" ["<casks>"]
#
# Homebrew, then everything in the order it depends on: taps before their
# formulae, brew's rust before the crates, brew's pnpm before the pnpm globals
# and the skills. Always returns 0, same as brew_install_batch.
#
# word splitting is the point here
# shellcheck disable=SC2086
install_packages() {
  if ! ensure_homebrew
  then
    log_warn "skipping packages - homebrew isn't usable"
    return 0
  fi

  log_step "installing packages"
  brew_trust_taps $BREW_TAPS
  brew_install_batch --formula $1
  if [ -n "${2:-}" ]
  then
    brew_install_batch --cask $2
  fi
  cargo_install_batch $CARGO_CRATES
  pnpm_global_install_batch $PNPM_GLOBALS
  agent_skills_install_batch $AGENT_SKILLS
}

# ~/.zshrc

# usage: write_zshrc PERSONAL_SETUP_MACOS PERSONAL_SETUP_MACOSBREW ...
#
# Writes the machine-specific half of the zsh config: the flags for this
# platform plus a source line pointing at the repo. Everything else lives in
# the repo, so this file stays tiny.
write_zshrc() {
  local zshrc="$HOME/.zshrc"
  local path flag

  log_step "setting up $zshrc"

  # Idempotency: if it's already wired up to the dotfiles, it's the user's file
  # now - hand-edited flags and all - so leave it completely alone.
  if [ -f "$zshrc" ] && grep -Fq 'configs/zsh/.zshrc' "$zshrc"
  then
    log_info "already sources the dotfiles - leaving it as it is"
    return 0
  fi

  backup_path "$zshrc"

  # "$HOME/..." and never '~/...': a tilde in single quotes is never expanded,
  # which leaves a literal ~ in the variable and breaks every path built from it.
  path="$DOTFILES_DIR"
  case "$path" in
    "$HOME"/*) path="\$HOME${path#"$HOME"}" ;;
  esac

  {
    printf '# Written by the dotfiles setup script (github.com/bnb/dotfiles) on %s.\n' "$(date '+%Y-%m-%d')"
    printf '#\n'
    printf '# Machine-specific flags only - the shared config is the repo file sourced\n'
    printf '# at the bottom. See configs/zsh/.zshrc for what every flag does.\n'
    printf '\n'
    printf 'export PERSONAL_DOTFILES_PATH="%s"\n' "$path"
    for flag in "$@"
    do
      printf 'export %s=true\n' "$flag"
    done
    printf '\n'
    printf 'source "$PERSONAL_DOTFILES_PATH/configs/zsh/.zshrc"\n'
  } > "$zshrc"

  log_info "wrote $zshrc"
  return 0
}

# git config

# ~/.gitconfig is a small real file that [include]s the repo's .gitconfig, not
# a symlink to it. Plenty of tools run `git config --global` - `gh auth login`
# offering to set up a credential helper, `git lfs install`, editors - and
# through a symlink every one of them wrote machine-specific paths into a file
# this repo tracks. Now they write here, after the include, and the repo copy
# stays as committed.
write_gitconfig() {
  local gitconfig="$HOME/.gitconfig"
  local src="$DOTFILES_DIR/.gitconfig"
  local include

  log_step "setting up $gitconfig"

  if [ ! -f "$src" ]
  then
    record_failure "$src doesn't exist - not writing $gitconfig"
    return 1
  fi

  # $HOME-relative, the same as write_zshrc; git expands a leading ~/ in an
  # include path
  include="$src"
  case "$include" in
    "$HOME"/*) include="~${include#"$HOME"}" ;;
  esac

  # Idempotency, as in write_zshrc: once it includes the repo copy it's the
  # user's file, and whatever tools have added to it stays
  if [ -f "$gitconfig" ] && grep -Fq -e "$include" -e "$src" "$gitconfig"
  then
    log_info "already includes $src - leaving it as it is"
    return 0
  fi

  backup_path "$gitconfig"

  {
    printf '# Written by the dotfiles setup script (github.com/bnb/dotfiles) on %s.\n' "$(date '+%Y-%m-%d')"
    printf '#\n'
    printf '# The shared settings are the repo file included below, which includes\n'
    printf '# ~/.gitconfig.local in turn. `git config --global` writes land in this\n'
    printf '# file, after the include, so they win and the repo copy stays clean.\n'
    printf '\n'
    printf '[include]\n'
    printf '\tpath = %s\n' "$include"
  } > "$gitconfig"

  log_info "wrote $gitconfig"
  return 0
}

# usage: link_dotfile configs/tg/config.toml ~/.config/tg/config.toml
#
# Symlinks a file from the repo into $HOME (or to the given path), backing up a
# real file first. The symlink means editing the repo copy is editing the live
# config, with no re-run needed.
link_dotfile() {
  local name="$1"
  local src="$DOTFILES_DIR/$name"
  local dest="${2:-$HOME/$name}"
  local current

  log_step "linking $dest -> $src"

  if [ ! -f "$src" ]
  then
    record_failure "$src doesn't exist - not linking $dest"
    return 1
  fi

  if [ -L "$dest" ]
  then
    current="$(readlink "$dest" 2>/dev/null || true)"
    if [ "$current" = "$src" ]
    then
      log_info "already linked"
      return 0
    fi
    log_info "$dest is a symlink to $current - replacing it"
  fi

  backup_path "$dest"
  mkdir -p "$(dirname "$dest")"
  ln -s "$src" "$dest"
  log_info "linked"
  return 0
}

# 1Password

# resolve_op_ssh_sign, OP_SSH_AGENT_SOCK and OP_SSH_AGENT_SOCK_MACOS, shared
# with configs/ai/automation-accounts.sh
# shellcheck source=setup/lib/onepassword.sh
. "$(dirname "${BASH_SOURCE[0]}")/onepassword.sh"

# ~/.ssh/config

# Points ssh at 1Password's agent, so `git pull` over SSH asks 1Password (Touch
# ID) instead of prompting for the on-disk key's passphrase. The block goes at
# the END of ~/.ssh/config: ssh keeps the first value it sees for each option, so
# any host above it that picks its own agent (OrbStack's include, say) still wins.
write_ssh_config() {
  local ssh_config="$HOME/.ssh/config"

  log_step "pointing ssh at the 1Password agent"

  if ! resolve_op_ssh_sign >/dev/null
  then
    log_info "1Password isn't installed here - leaving ssh on its default agent"
    return 0
  fi

  mkdir -p "$(dirname "$OP_SSH_AGENT_SOCK")"
  chmod 700 "$(dirname "$OP_SSH_AGENT_SOCK")"

  if [ "$(uname -s)" = "Darwin" ]
  then
    if [ -L "$OP_SSH_AGENT_SOCK" ] && [ "$(readlink "$OP_SSH_AGENT_SOCK")" = "$OP_SSH_AGENT_SOCK_MACOS" ]
    then
      log_info "already linked: $OP_SSH_AGENT_SOCK"
    elif [ -e "$OP_SSH_AGENT_SOCK" ] || [ -L "$OP_SSH_AGENT_SOCK" ]
    then
      record_failure "$OP_SSH_AGENT_SOCK exists and isn't a link to 1Password's socket - leaving it alone"
      return 1
    else
      # Fine to link before the socket exists: it appears the moment the agent
      # is turned on, and the link starts working then without a re-run.
      log_info "linking $OP_SSH_AGENT_SOCK -> $OP_SSH_AGENT_SOCK_MACOS"
      ln -s "$OP_SSH_AGENT_SOCK_MACOS" "$OP_SSH_AGENT_SOCK"
    fi
  fi

  if [ ! -S "$OP_SSH_AGENT_SOCK" ]
  then
    log_warn "the 1Password SSH agent isn't running yet - turn it on in 1Password > Settings > Developer"
  fi

  if [ -f "$ssh_config" ] && grep -Fq '.1password/agent.sock' "$ssh_config"
  then
    log_info "$ssh_config already uses the 1Password agent"
    return 0
  fi

  if [ ! -d "$HOME/.ssh" ]
  then
    mkdir -p "$HOME/.ssh"
    chmod 700 "$HOME/.ssh"
  fi

  if [ ! -f "$ssh_config" ]
  then
    touch "$ssh_config"
    chmod 600 "$ssh_config"
  fi

  # don't glue the new Host line onto the end of an unterminated last line
  if [ -s "$ssh_config" ] && [ -n "$(tail -c 1 "$ssh_config")" ]
  then
    printf '\n' >> "$ssh_config"
  fi

  {
    printf '\n'
    printf '# 1Password SSH agent - added by the dotfiles setup script (github.com/bnb/dotfiles).\n'
    printf '# Keep this last: ssh uses the first value it finds for each option.\n'
    printf 'Host *\n'
    printf '  IdentityAgent ~/.1password/agent.sock\n'
  } >> "$ssh_config"

  log_info "added IdentityAgent to $ssh_config"
  return 0
}

# Everything machine-specific goes in ~/.gitconfig.local, which the committed
# .gitconfig pulls in with an [include]. Written with `git config --file` rather
# than a heredoc so anything else already in that file survives, and so a second
# run is a no-op instead of a rewrite.
write_gitconfig_local() {
  local local_config="$HOME/.gitconfig.local"
  local signer

  # The SSH signing *public* key. Not secret, but it is only usable on a machine
  # holding the matching private key, so it belongs next to the rest of the
  # signing block rather than in the committed .gitconfig.
  local signing_key="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCqPvkJPs/pYz+/+9231qVBlrfdtmvc34ZjiAzUlnsMkQBTUUzqFqTWA83CrgKB7KCh8+YuBq0s6CtN4FbAw2Ub5X/ntjCzOf3HPraOf6FgtWw3VPjLe0Ou0dZRsPKvncqWMNt1+Jd2oDScK3LCYDfiswNPww2R7cUAQSGxURfUdeFgHQP+Jel38uDI3z+DjbBF/KThZdoe1Jnhg1mj738GM83k0mLZ5y4AXxYfYwmBp9Kiqly3tcZilQ2N4LOVNt5T0velhfHzJ6cSULkT+9tS01ZZsDK6A7R6JQWSAt2dVAqQQyAq26g+UQP25ZJu7pWjYUikl0+2cUe1Vz7i6lKdFO6ckzaeZBEpI2KvNaL7wXFolL3FeXAHrBQdXj2bXbItnA3hPo2s6Zm+OV5iF3byEr8n/49GCIUZAuKY8ZYOHnlaon+yHeHHqAcOqUah4EOiTUD9oQ5W2nkbJOv3PSap/01/e4ZCQfcRRbYJIaMYPGsk22SUKgFA9w2mYGBwCm5OYadGfVXJVFwtqTQvoeuveOkRmYHGgGM2zucEVx6guW78sTfsE/24kWprjF3L9rM6FQQYZHpwNQbm9F5VIT92lOlbdTlyT4DRuMDxPL4WLXNjNFxbEQtAFnaxbJQaCL8CFuZvr1HiXwXbWiAWBNR9R6BTwsI5UwoG1sV/lTjT5Q=="

  log_step "setting up $local_config"

  if ! command -v git >/dev/null 2>&1
  then
    record_failure "git isn't installed - can't write $local_config"
    return 1
  fi

  # The signer's path differs per machine (and doesn't exist at all on most of
  # them), which is exactly why it can't live in the committed .gitconfig: every
  # machine without 1Password installed would fail to commit.
  if ! signer="$(resolve_op_ssh_sign)"
  then
    log_info "no 1Password op-ssh-sign on this machine - leaving commit signing off"
    log_info "(install 1Password and re-run this script to turn it on)"
    return 0
  fi

  log_info "found op-ssh-sign at $signer - turning on signed commits"
  git config --file "$local_config" user.signingkey "$signing_key"
  git config --file "$local_config" gpg.format ssh
  git config --file "$local_config" gpg.ssh.program "$signer"
  git config --file "$local_config" commit.gpgsign true

  return 0
}

# AI agents' forge accounts

# Re-applies configs/ai/automation-accounts.sh for each forge on every run, so
# the agents stay on the automation accounts even after one of them (or
# clauth) rewrites its own config. It can't do the first login - that needs a browser
# and a person, and this run has neither - so until `config:ai-github login` /
# `config:ai-tangled login` has happened once, the script just says so and this
# moves on.
wire_ai_accounts() {
  local forge status

  for forge in github tangled
  do
    log_step "pointing the agents at the $forge automation account"

    bash "$DOTFILES_DIR/configs/ai/automation-accounts.sh" "$forge" apply
    status=$?

    case "$status" in
      0|2) ;; # 2 is "not logged in yet", which the script has already explained
      *) record_failure "config:ai-$forge apply" ;;
    esac
  done

  return 0
}

# Claude Code's "Project instructions" setting (/config) in
# ~/.claude/settings.json: read CLAUDE.md and AGENTS.md files together. By
# default a CLAUDE.md in or above the working directory stops it reading any
# AGENTS.md, and the work one sits above every work repo. A value already
# picked in /config is left alone.
claude_reads_agents_md() {
  log_step "having Claude Code read AGENTS.md alongside CLAUDE.md"
  PYTHONPATH="$DOTFILES_DIR/setup/lib${PYTHONPATH:+:$PYTHONPATH}" PYTHONDONTWRITEBYTECODE=1 \
    python3 - "$HOME/.claude/settings.json" <<'PY' || record_failure "couldn't update ~/.claude/settings.json"
import sys
from config_file import read_json, write_json

path = sys.argv[1]
settings = read_json(path)
options = settings.setdefault("pluginConfigs", {}).setdefault("agents-md@builtin", {}).setdefault("options", {})
if options.get("instructionFiles", "claude-md-or-agents-md") != "claude-md-or-agents-md":
    print("already set to %s" % options["instructionFiles"])
    sys.exit(0)
options["instructionFiles"] = "claude-md-and-agents-md"
write_json(path, settings)
print("set")
PY
}

# Links configs/ai/instructions.md in as both agents' user-level instructions.
# Always the real ~/.claude, like automation-accounts.sh: `clauth start` copies
# its CLAUDE.md into each profile's runtime (only --isolated leaves it out).
link_ai_instructions() {
  link_dotfile configs/ai/instructions.md "$HOME/.claude/CLAUDE.md" || true
  link_dotfile configs/ai/instructions.md "${CODEX_HOME:-$HOME/.codex}/AGENTS.md" || true
  return 0
}

# usage: link_claude_skill television
#
# Gives Claude Code the same relative symlink into ~/.agents/skills (which
# Codex reads as is) that the Skills CLI makes. A real directory already there
# is left alone.
link_claude_skill() {
  local link="$HOME/.claude/skills/$1"

  mkdir -p "$HOME/.claude/skills"
  if [ -e "$link" ] && [ ! -L "$link" ]
  then
    log_warn "$link isn't a symlink - leaving it alone"
    return 0
  fi
  ln -sfn "../../.agents/skills/$1" "$link"
}

# My own skills in configs/ai/skills: the rules from instructions.md that only
# matter in some projects, so they load when needed instead of every session.
link_ai_skills() {
  local skill name

  for skill in "$DOTFILES_DIR"/configs/ai/skills/*/
  do
    name="$(basename "$skill")"
    link_dotfile "configs/ai/skills/$name/SKILL.md" "$HOME/.agents/skills/$name/SKILL.md" || continue
    link_claude_skill "$name"
  done
  return 0
}

# Settings that enforce rules instructions.md can only ask for: no attribution
# lines, none of Claude Code's own git instructions, and pushes asking first
# (configs/ai/claude-settings.json, and configs/ai/codex-git.rules for Codex).
# Added to ~/.claude/settings.json: lists gain the missing entries, and a key
# already set to something else is left alone. Entries in RETIRED were mine
# once and get taken out. clauth copies these keys into work sessions too.
enforce_ai_rules() {
  log_step "adding my guardrails to Claude Code's settings"
  PYTHONPATH="$DOTFILES_DIR/setup/lib${PYTHONPATH:+:$PYTHONPATH}" PYTHONDONTWRITEBYTECODE=1 \
    python3 - "$HOME/.claude/settings.json" "$DOTFILES_DIR/configs/ai/claude-settings.json" <<'PY' || record_failure "couldn't update ~/.claude/settings.json"
import json
import sys
from config_file import read_json, write_json

path, ours = sys.argv[1:]
settings = read_json(path)

# the guardrails that kept agents out of worktrees, before they used riftri
RETIRED = {"ask": ["Bash(git worktree add *)"], "deny": ["Agent(isolation:worktree)"]}


def retire(permissions):
    changed = False
    for key, items in RETIRED.items():
        current = permissions.get(key)
        if not isinstance(current, list):
            continue
        kept = [item for item in current if item not in items]
        changed = changed or len(kept) != len(current)
        permissions[key] = kept
    return changed


def merge(current, wanted):
    changed = False
    for key, value in wanted.items():
        if key not in current:
            current[key] = value
            changed = True
        elif isinstance(value, dict) and isinstance(current[key], dict):
            changed = merge(current[key], value) or changed
        elif isinstance(value, list) and isinstance(current[key], list):
            missing = [item for item in value if item not in current[key]]
            current[key].extend(missing)
            changed = changed or bool(missing)
        elif current[key] != value:
            print("leaving %s as %s" % (key, json.dumps(current[key])))
    return changed


retired = isinstance(settings.get("permissions"), dict) and retire(settings["permissions"])
if merge(settings, read_json(ours)) or retired:
    write_json(path, settings)
    print("updated")
else:
    print("already set")
PY
  link_dotfile configs/ai/codex-git.rules "${CODEX_HOME:-$HOME/.codex}/rules/git.rules" || true
  return 0
}

# Only on a machine with my work checkouts:
#
# - the keys work repos push with, mine and the bot's (configs/git/*.gitconfig)
# - configs/ai/assistant-ui.md above the checkouts as both CLAUDE.md and
#   AGENTS.md. Claude Code reads a CLAUDE.md from every directory above the
#   working directory. Codex stops at the repo's root, so a SessionStart hook
#   hands it the AGENTS.md instead.
# - Claude in VS Code on the work account
link_work_files() {
  [ -d "$WORK_DIR" ] || return 0

  link_dotfile configs/git/assistant-ui.pub "$HOME/.ssh/assistant-ui.pub" || true
  link_dotfile configs/git/assistant-ui-botandbang.pub "$HOME/.ssh/assistant-ui-botandbang.pub" || true
  link_dotfile configs/ai/assistant-ui.md "$WORK_DIR/CLAUDE.md" || true
  link_dotfile configs/ai/assistant-ui.md "$WORK_DIR/AGENTS.md" || true
  claude_reads_agents_md || true
  link_dotfile configs/ai/codex-hooks.json "${CODEX_HOME:-$HOME/.codex}/hooks.json" || true
  vscode_claude_on_work_account || true
  return 0
}

# Claude in VS Code is for work and the Claude desktop app isn't, so VS Code's
# goes through configs/ai/vscode-claude.sh, which starts it on the work clauth
# profile. Sets that as claudeCode.claudeProcessWrapper in each VS Code with
# user settings, unless something else is set there already.
vscode_claude_on_work_account() {
  local base variant dir

  for base in "$HOME/Library/Application Support" "${XDG_CONFIG_HOME:-$HOME/.config}"
  do
    for variant in "Code" "Code - Insiders"
    do
      dir="$base/$variant/User"
      [ -d "$dir" ] || continue
      log_step "running Claude in $variant on the work account"
      PYTHONPATH="$DOTFILES_DIR/setup/lib${PYTHONPATH:+:$PYTHONPATH}" PYTHONDONTWRITEBYTECODE=1 \
        python3 - "$dir/settings.json" "$DOTFILES_DIR/configs/ai/vscode-claude.sh" <<'PY' || record_failure "couldn't update $dir/settings.json"
import sys
from config_file import read_json, write_json

path, wrapper = sys.argv[1:]
settings = read_json(path)
current = settings.get("claudeCode.claudeProcessWrapper")
if current == wrapper:
    print("already set")
    sys.exit(0)
if current:
    print("leaving it on %s" % current)
    sys.exit(0)
settings["claudeCode.claudeProcessWrapper"] = wrapper
write_json(path, settings, indent=4)
print("set")
PY
    done
  done
}

# Shared tail end of both platforms

# usage: finalize_shell_config PERSONAL_SETUP_MACOS PERSONAL_SETUP_MACOSBREW ...
finalize_shell_config() {
  write_zshrc "$@" || true
  write_gitconfig || true
  link_dotfile configs/tg/config.toml "${XDG_CONFIG_HOME:-$HOME/.config}/tg/config.toml" || true
  write_gitconfig_local || true
  write_ssh_config || true
  wire_ai_accounts || true
  link_ai_instructions || true
  link_ai_skills || true
  enforce_ai_rules || true
  link_work_files || true
}

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
GITHUB_ORGS=(bnb)
TANGLED_ORGS=(bnb.im)

# Where the dotfiles clone lives. $DOTFILES_DIR overrides it.
DOTFILES_REPO_URL="${DOTFILES_REPO_URL:-https://github.com/bnb/dotfiles.git}"
DOTFILES_DIR="${DOTFILES_DIR:-$HOME/GitHub/bnb/dotfiles}"

# Set by setup.sh to the directory the running copy of the repo lives in, so
# ensure_dotfiles_repo() knows not to `git pull` underneath itself.
DOTFILES_REPO_ROOT="${DOTFILES_REPO_ROOT:-}"

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

dotfiles_failure_count() {
  printf '%s\n' "${#DOTFILES_FAILURES[@]}"
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
# finished cleanly, tripped over `set -e`, or was interrupted.
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

ensure_dir() {
  local dir="$1"

  if [ -d "$dir" ]
  then
    log_info "already there: $dir"
    return 0
  fi

  log_info "creating: $dir"
  mkdir -p "$dir"
}

# ~/GitHub/<org> and ~/tangled/<org> for every name in the arrays at the top.
ensure_directory_invariant() {
  local org

  log_step "making sure the standard directories exist"

  for org in ${GITHUB_ORGS[@]+"${GITHUB_ORGS[@]}"}
  do
    ensure_dir "$HOME/GitHub/$org"
  done

  for org in ${TANGLED_ORGS[@]+"${TANGLED_ORGS[@]}"}
  do
    ensure_dir "$HOME/tangled/$org"
  done
}

# Homebrew

# Prints the prefix on stdout, or returns 1 if brew isn't installed anywhere we
# know about. Never hardcode /opt/homebrew: that's apple silicon's prefix, and
# an intel mac puts brew in /usr/local.
resolve_brew_prefix() {
  local candidate

  for candidate in \
    "${HOMEBREW_PREFIX:-}" \
    /opt/homebrew \
    /usr/local \
    /home/linuxbrew/.linuxbrew \
    "$HOME/.linuxbrew"
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

  # quieter, and never stop to ask a question during an unattended run
  export HOMEBREW_NO_ENV_HINTS=1
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

  installed="$(brew list "$kind" 2>/dev/null || true)"

  for pkg in "$@"
  do
    if printf '%s\n' "$installed" | grep -Fxq "$pkg"
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

# Clone dotfiles
ensure_dotfiles_repo() {
  local parent

  log_step "making sure the dotfiles clone is at $DOTFILES_DIR"

  if ! command -v git >/dev/null 2>&1
  then
    record_failure "git isn't installed - can't set up $DOTFILES_DIR"
    return 1
  fi

  if [ -d "$DOTFILES_DIR/.git" ]
  then
    if [ -n "$DOTFILES_REPO_ROOT" ] && [ "$DOTFILES_REPO_ROOT" = "$DOTFILES_DIR" ]
    then
      log_info "this script is running from that clone - not pulling underneath itself"
      return 0
    fi

    if [ -n "$(git -C "$DOTFILES_DIR" status --porcelain 2>/dev/null)" ]
    then
      log_warn "the clone has uncommitted changes - skipping the pull so nothing gets clobbered"
      return 0
    fi

    log_info "already cloned - pulling"
    if ! git -C "$DOTFILES_DIR" pull --ff-only
    then
      log_warn "git pull failed - carrying on with the clone as it is"
    fi
    return 0
  fi

  if [ -e "$DOTFILES_DIR" ] || [ -L "$DOTFILES_DIR" ]
  then
    record_failure "$DOTFILES_DIR exists but isn't a git clone - leaving it alone; move it aside and re-run"
    return 1
  fi

  parent="$(dirname "$DOTFILES_DIR")"
  mkdir -p "$parent"

  log_info "cloning $DOTFILES_REPO_URL"
  if ! git clone "$DOTFILES_REPO_URL" "$DOTFILES_DIR"
  then
    record_failure "git clone $DOTFILES_REPO_URL into $DOTFILES_DIR failed"
    return 1
  fi

  return 0
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

# usage: link_dotfile .gitconfig
#
# Symlinks a file from the repo into $HOME, backing up a real file first. The
# symlink means editing the repo copy is editing the live config, with no
# re-run needed.
link_dotfile() {
  local name="$1"
  local src="$DOTFILES_DIR/$name"
  local dest="$HOME/$name"
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
  ln -s "$src" "$dest"
  log_info "linked"
  return 0
}

# Everything machine-specific goes in ~/.gitconfig.local, which the committed
# .gitconfig pulls in with an [include]. Written with `git config --file` rather
# than a heredoc so anything else already in that file survives, and so a second
# run is a no-op instead of a rewrite.
write_gitconfig_local() {
  local local_config="$HOME/.gitconfig.local"
  local repo_config="$DOTFILES_DIR/.gitconfig"
  local candidate signer=""

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

  # 1Password's SSH signer. The path differs per machine (and doesn't exist at
  # all on most of them), which is exactly why it can't live in the committed
  # .gitconfig: every machine without 1Password installed would fail to commit.
  for candidate in \
    "${OP_SSH_SIGN:-}" \
    "/Applications/1Password.app/Contents/MacOS/op-ssh-sign" \
    "$HOME/Applications/1Password.app/Contents/MacOS/op-ssh-sign" \
    "/opt/1Password/op-ssh-sign" \
    "/usr/bin/op-ssh-sign" \
    "/usr/local/bin/op-ssh-sign"
  do
    if [ -n "$candidate" ] && [ -x "$candidate" ]
    then
      signer="$candidate"
      break
    fi
  done

  if [ -z "$signer" ] && command -v op-ssh-sign >/dev/null 2>&1
  then
    signer="$(command -v op-ssh-sign)"
  fi

  if [ -z "$signer" ]
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

  # The committed .gitconfig is supposed to end with an [include] pointing here.
  # If it doesn't, this file is inert
  if [ -f "$repo_config" ] && ! grep -Fq 'gitconfig.local' "$repo_config"
  then
    log_warn "$repo_config has no [include] for ~/.gitconfig.local - the signing config above won't be picked up"
  fi

  return 0
}

# Shared tail end of both platforms

# usage: finalize_shell_config PERSONAL_SETUP_MACOS PERSONAL_SETUP_MACOSBREW ...
finalize_shell_config() {
  ensure_dotfiles_repo || true
  write_zshrc "$@" || true
  link_dotfile .gitconfig || true
  link_dotfile .npmrc || true
  write_gitconfig_local || true
}

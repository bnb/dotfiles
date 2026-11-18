__personal_debug "eval'ing fnm env"

# set up fnm
if command -v fnm > /dev/null
then
  # fnm normally works out which shell it's in by walking the process tree,
  # but that fails ("Can't infer shell!") when the shell was started by an
  # app or launcher rather than a terminal. It's always zsh - like its
  # neighbours, this file is only ever sourced from .zshrc - so say so.
  # .node-version is the source of truth, found from any subfolder: `recursive`
  # walks up to the repo root's file, and engines resolution is off because a
  # subpackage's `"engines": {"node": ">=24.12"}` otherwise picked the newest
  # installed Node over the root's .node-version, and pnpm rebuilt native
  # modules for the wrong ABI.
  eval "$(fnm env --shell zsh --version-file-strategy=recursive --resolve-engines=false)"
else
  __personal_warn "\$PERSONAL_SETUP_FNM is on but fnm isn't installed"
fi

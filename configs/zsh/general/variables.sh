# The two directory trees the setup script guarantees on every machine. They're
# the one bit of layout that's actually consistent everywhere, so exporting them
# means scripts and child processes can rely on them instead of each rebuilding
# "$HOME/GitHub" by hand.
#
# Both honour a value set before this file is sourced, for a machine that keeps
# its checkouts somewhere else.
export PERSONAL_GITHUB_DIR="${PERSONAL_GITHUB_DIR:-$HOME/GitHub}"
export PERSONAL_TANGLED_DIR="${PERSONAL_TANGLED_DIR:-$HOME/tangled}"

# The repo's .npmrc, as npm's *global* config rather than a ~/.npmrc symlink.
# npm writes tokens (`npm login`, `npm config set //host/:_authToken=...`) to
# ~/.npmrc, and through a symlink they'd land in this public repo; it never
# writes to the global config unless asked for --location=global. ~/.npmrc
# stays a plain per-machine file and wins over this one where they overlap;
# `config:npm` copies these settings into it for npm started outside zsh.
export NPM_CONFIG_GLOBALCONFIG="${NPM_CONFIG_GLOBALCONFIG:-$PERSONAL_DOTFILES_PATH/.npmrc}"

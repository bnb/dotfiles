# The two directory trees the setup script guarantees on every machine. They're
# the one bit of layout that's actually consistent everywhere, so exporting them
# means scripts and child processes can rely on them instead of each rebuilding
# "$HOME/GitHub" by hand.
#
# Both honour a value set before this file is sourced, for a machine that keeps
# its checkouts somewhere else.
export PERSONAL_GITHUB_DIR="${PERSONAL_GITHUB_DIR:-$HOME/GitHub}"
export PERSONAL_TANGLED_DIR="${PERSONAL_TANGLED_DIR:-$HOME/tangled}"

__personal_debug "exporting PNPM_HOME and the pnpm global bin path"

# `pnpm add -g` refuses to run unless its global bin directory is already on
# $PATH (ERR_PNPM_GLOBAL_BIN_DIR_NOT_IN_PATH). `pnpm setup` fixes that by
# appending a block to ~/.zshrc; this replaces that block, so ~/.zshrc stays the
# stub setup.sh writes.
#
# No flag, and unlike cargo.sh it doesn't wait for the directory to exist: pnpm
# checks $PATH before it creates anything, so waiting would mean the first
# global install always fails.
#
# pnpm 12 puts the bins in $PNPM_HOME/bin, not in $PNPM_HOME itself the way
# older versions did.
source "$PERSONAL_ZSH_DIR/pnpm/home.sh"
path=("$PNPM_HOME/bin" $path)

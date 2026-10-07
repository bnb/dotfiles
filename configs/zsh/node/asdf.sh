__personal_debug "exporting asdf path"

# set up asdf
#
# asdf only needs its shims directory on $PATH. That directory doesn't exist
# until the first `asdf install`, so it's added either way - the same as
# pnpm.sh - rather than warning on every shell of a freshly set up machine.
# The warning is for asdf itself being missing.
__personal_asdf_shims="${ASDF_DATA_DIR:-$HOME/.asdf}/shims"
if (( $+commands[asdf] )) || [ -d "$__personal_asdf_shims" ]
then
  path=("$__personal_asdf_shims" $path)
else
  __personal_warn "\$PERSONAL_SETUP_ASDF is on but asdf isn't installed"
fi
unset __personal_asdf_shims

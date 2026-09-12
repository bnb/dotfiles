__personal_debug "exporting asdf path"

# set up asdf
__personal_asdf_shims="${ASDF_DATA_DIR:-$HOME/.asdf}/shims"
if [ -d "$__personal_asdf_shims" ]
then
  typeset -U path PATH
  path=("$__personal_asdf_shims" $path)
else
  __personal_warn "$PERSONAL_SETUP_ASDF is on but $__personal_asdf_shims doesn't exist"
fi
unset __personal_asdf_shims

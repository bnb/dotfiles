__personal_debug "eval'ing fnm env"

# set up fnm
if command -v fnm > /dev/null
then
  eval "$(fnm env)"
else
  __personal_warn "$PERSONAL_SETUP_FNM is on but fnm isn't installed"
fi

if [ -n "$PERSONAL_SETUP_DEBUG" ]
then
  echo "exporting asdf path"
fi

# set up asdf
export PATH="${ASDF_DATA_DIR:-$HOME/.asdf}/shims:$PATH"

if [ -n "$PERSONAL_SETUP_DEBUG" ]
then
  echo "eval'ing `fnm env`"
fi

# set up fnm
eval $(fnm env)
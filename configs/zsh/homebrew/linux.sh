if [ -n "$PERSONAL_SETUP_DEBUG" ]
then
  echo "running the linuxbrew setup command"
fi

eval $(/home/linuxbrew/.linuxbrew/bin/brew shellenv)
if [ -n "$PERSONAL_SETUP_DEBUG" ]
then
  echo "running the homebrew macos setup commands"
fi

eval "$(/opt/homebrew/bin/brew shellenv)"
__personal_debug "running the homebrew macos setup commands"

if [ -x /opt/homebrew/bin/brew ]
then
  eval "$(/opt/homebrew/bin/brew shellenv)"
else
  __personal_debug "skipping homebrew: /opt/homebrew/bin/brew isn't there"
fi

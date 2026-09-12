__personal_debug "running the linuxbrew setup command"

if [ -x /home/linuxbrew/.linuxbrew/bin/brew ]
then
  eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
else
  __personal_debug "skipping linuxbrew: /home/linuxbrew/.linuxbrew/bin/brew isn't there"
fi

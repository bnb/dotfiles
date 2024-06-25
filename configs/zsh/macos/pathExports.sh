if [ -n "$PERSONAL_SETUP_DEBUG" ]
then
  echo "exporting a lot of macOS paths"
fi

export PATH="/Users/$user/bin:$PATH"
export PATH="/usr/local/bin:$PATH"
export PATH="/usr/bin:$PATH"
export PATH="/bin:$PATH"
export PATH="/usr/sbin:$PATH"
export PATH="/sbin:$PATH"
export PATH="/Users/$user/GitHub/build-tools/src:$PATH"
export PATH="/usr/local/opt/python/libexec/bin:$PATH"
export PATH="/opt/homebrew/bin:$PATH"

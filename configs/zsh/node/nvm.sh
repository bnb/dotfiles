if [ -n "$PERSONAL_SETUP_DEBUG" ]
then
  echo "exporting NVM_DIR and running some commmands"
fi

# set up nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
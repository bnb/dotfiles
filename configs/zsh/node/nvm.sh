if [ -n "$PERSONAL_SETUP_DEBUG" ]
then
  echo "exporting NVM_DIR and running some commmands"
fi

# set up nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$(brew --prefix)/opt/nvm/nvm.sh" ] && \. "$(brew --prefix)/opt/nvm/nvm.sh" # This loads nvm

# Environemnt Variables - set these up in the `.zshrc` that imports this `.zshrc`:
#
#  $PERSONAL_SETUP_LINUXBREW: if this is a machine you want to use linuxbrew on, set this to
#  $PERSONAL_SETUP_MACOS: if this is a macOS machine, set to `true`
#  $PERSONAL_SETUP_NVM: if you'd like to include the shell scripts that make nvm work, set to `true`
#  $PERSONAL_SETUP_STARSHIP: if using starship.rs, set to `true`
#  $PERSONAL_SETUP_WORK: if this is a work machine, set to `true`
#  $PERSONAL_SETUP_ZSHPLUGINS: if you want to enable my personal plugin config, set to `true`

if [ -n "$PERSONAL_SETUP_DEBUG" ]
then
  echo "setting up general"
fi

source $(dirname "$0")/general/aliases.sh
source $(dirname "$0")/general/autotitle.sh
source $(dirname "$0")/general/correction.sh
source $(dirname "$0")/general/language.sh
source $(dirname "$0")/general/sshKeyPath.sh
source $(dirname "$0")/general/variables.sh

# check if $PERSONAL_SETUP_LINUXBREW exists and if so, eval linuxbrew 
if [ -n "$PERSONAL_SETUP_LINUXBREW" ]
then
  if [ -n "$PERSONAL_SETUP_DEBUG" ]
  then
    echo "setting up linuxbrew"
  fi
  eval $(/home/linuxbrew/.linuxbrew/bin/brew shellenv)
fi

# set up nvm
if [ -n "$PERSONAL_SETUP_NVM" ]
then
  if [ -n "$PERSONAL_SETUP_DEBUG" ]
  then
    echo "setting up nvm"
  fi
  source $(dirname "$0")/general/nvm.sh
fi

# check if $PERSONAL_SETUP_STARSHIP is true and if so, set up starship init file
if [ -n "$PERSONAL_SETUP_STARSHIP" ]
then
  if [ -n "$PERSONAL_SETUP_DEBUG" ]
  then
    echo "setting up starship"
  fi
  source $(dirname "$0")/starship/init.sh
fi

# check if $PERSONAL_SETUP_ZSHPLUGINS is true and if so, source the zsh plugins
if [ -n "$PERSONAL_SETUP_ZSHPLUGINS" ]
then
  if [ -n "$PERSONAL_SETUP_DEBUG" ]
  then
    echo "setting up zshplugins"
  fi
  source $(dirname "$0")/plugins/zshplugins.sh
fi

# check if $PERSONAL_SETUP_MACOS is true and if so, use source $(dirname "$0")/macos/pathExports.sh 
if [  -n "$PERSONAL_SETUP_MACOS" ]
then
  if [ -n "$PERSONAL_SETUP_DEBUG" ]
  then
    echo "setting up macOS"
  fi
  source $(dirname "$0")/macos/pathExports.sh
fi

# check if $PERSONAL_SETUP_WORK and $PERSONAL_SETUP_MACOS are set to true and if so, use source $(dirname "$0")/work/aliases.sh
if [ -n "$PERSONAL_SETUP_WORK" ] && [ -n "$PERSONAL_SETUP_MACOS"="true" ]
then
  if [ -n "$PERSONAL_SETUP_DEBUG" ]
  then
    echo "setting up work"
  fi
  source $(dirname "$0")/work/aliases.sh
fi

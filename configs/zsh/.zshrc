# Environemnt Variables:
#
#  $PERSONAL_SETUP_MACOS: if this is a macOS machine, set to `true`
#  $PERSONAL_SETUP_NVM: if you'd like to include the shell scripts that make nvm work, set to `true`
#  $PERSONAL_SETUP_STARSHIP: if using starship.rs, set to `true`
#  $PERSONAL_SETUP_WORK: if this is a work machine, set to `true`
#  $PERSONAL_SETUP_ZSHPLUGINS: if you want to enable my personal plugin config, set to `true`

source $(dirname "$0")/general/aliases.sh
source $(dirname "$0")/general/autotitle.sh
source $(dirname "$0")/general/correction.sh
source $(dirname "$0")/general/language.sh
source $(dirname "$0")/general/sshKeyPath.sh
source $(dirname "$0")/general/variables.sh

# set up nvm
if [ $PERSONAL_SETUP_NVM=true ]
then
  source $(dirname "$0")/general/nvm.sh
fi

# set up starship initialization
if [ $PERSONAL_SETUP_STARSHIP=true ]
then
  source $(dirname "$0")/starship/init.sh
fi

# set up zsh plugins
if [ $PERSONAL_SETUP_ZSHPLUGINS=true ]
then
  source $(dirname "$0")/plugins/zshplugins.sh
fi

# set up macos path exports
if [ $PERSONAL_SETUP_MACOS=true ]
then
  source $(dirname "$0")/macos/pathExports.sh
fi

if [ $PERSONAL_SETUP_WORK=true ] && [ $PERSONAL_SETUP_MACOS=true ]
then
  source $(dirname "$0")/work/aliases.sh
fi
rm -rf ~/.zshrc

# quoted heredoc: everything below is written literally, so the $VARS and
# `backticks` land in ~/.zshrc instead of being expanded/run right now
cat >> ~/.zshrc <<'EOF'
# Environemnt Variables:
#
# Every flag below is off unless it's set to `true` (`1`/`yes`/`on` also work).
# Setting one to `false` turns it off.
#
# Only one node version manager is ever loaded, even if several are `true`:
# nvm wins over fnm, and fnm wins over asdf.
#
#  $PERSONAL_DOTFILES_PATH: path to my personal dotfiles repo
#  $PERSONAL_SETUP_MACOSBREW: if this is a macOS machine you want to use homebrew on, set this to `true`
#  $PERSONAL_SETUP_LINUXBREW: if this is a machine you want to use linuxbrew on, set this to `true`
#  $PERSONAL_SETUP_MACOS: if this is a macOS machine, set to `true`
#  $PERSONAL_SETUP_FNM: if you'd like to include the shell scripts that make fnm work, set to `true`
#  $PERSONAL_SETUP_NVM: if you'd like to include the shell scripts that make nvm work, set to `true`
#  $PERSONAL_SETUP_ASDF: if you'd like to include the shell scripts that make asdf work, set to `true`
#  $PERSONAL_SETUP_STARSHIP: if using starship.rs, set to `true`
#  $PERSONAL_SETUP_WORK: if this is a work machine, set to `true`
#  $PERSONAL_SETUP_ZSHPLUGINS: if you want to enable my personal plugin config, set to `true`
#  $PERSONAL_SETUP_DEBUG: to print what's being set up as it happens, set to `true`

# export PERSONAL_DOTFILES_PATH="$HOME/GitHub/bnb/dotfiles"
# export PERSONAL_SETUP_MACOSBREW=true
# export PERSONAL_SETUP_LINUXBREW=true
# export PERSONAL_SETUP_MACOS=true
# export PERSONAL_SETUP_FNM=true
# export PERSONAL_SETUP_NVM=true
# export PERSONAL_SETUP_ASDF=true
# export PERSONAL_SETUP_STARSHIP=true
# export PERSONAL_SETUP_WORK=true
# export PERSONAL_SETUP_ZSHPLUGINS=true
# export PERSONAL_SETUP_DEBUG=true

# source $PERSONAL_DOTFILES_PATH/configs/zsh/.zshrc
EOF

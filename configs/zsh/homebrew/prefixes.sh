# shellcheck shell=bash
#
# Where homebrew can live: /opt/homebrew on apple silicon, /usr/local on intel,
# /home/linuxbrew/.linuxbrew on linux, and ~/.linuxbrew for an unprivileged
# linux install. Shared by configs/zsh/general/helpers.sh and
# setup/lib/common.sh, so the shell finds brew wherever setup.sh does.
# Definitions only, and it has to work in zsh and in bash 3.2.

# shellcheck disable=SC2034 # read by the files that source this
__PERSONAL_BREW_PREFIXES=(/opt/homebrew /usr/local /home/linuxbrew/.linuxbrew "$HOME/.linuxbrew")

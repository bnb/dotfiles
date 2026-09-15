# shellcheck shell=bash
# Applies my git identity to this machine. Sourced by the `config:git` alias.
#
# This writes to ~/.gitconfig.local, NOT to ~/.gitconfig via `--global`.
#
# Why: setup.sh symlinks the repo's committed .gitconfig to ~/.gitconfig, and
# `git config --global` follows that symlink and rewrites the file it points
# at — i.e. the .gitconfig inside the dotfiles repo.
#
# ~/.gitconfig.local is a plain file that the committed .gitconfig includes as
# its last entry, so values written here override the committed defaults and
# nothing in the repo changes.

if ! command -v git > /dev/null 2>&1; then
	echo "config:git - git is not installed; nothing to configure." >&2
else
	_config_git_local="${HOME}/.gitconfig.local"

	git config --file "${_config_git_local}" user.name "Tierney Cyren"
	git config --file "${_config_git_local}" user.email "hello@bnb.im"

	echo "config:git - identity written to ${_config_git_local}"
	echo "config:git - verify with: git config --get user.email   (NOT --global, which skips includes)"

	unset _config_git_local
fi

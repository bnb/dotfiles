# shellcheck shell=bash
# Applies my npm defaults to this machine. Sourced by the `config:npm` alias.
#
# Guarded on npm being installed, and guarded against writing into the repo:
# `npm config set` writes to ~/.npmrc and, like `git config --global`, follows a
# symlink and rewrites the file it points at. setup.sh does not currently symlink
# the repo's .npmrc, but if it ever does, running this would dirty the dotfiles
# working tree — so bail out in that case, since the same values are already 
# declared in the committed .npmrc anyway.

if ! command -v npm > /dev/null 2>&1; then
	echo "config:npm - npm is not installed; skipping." >&2
elif [ -L "${HOME}/.npmrc" ]; then
	echo "config:npm - ~/.npmrc is a symlink into the dotfiles repo; these values are already declared there. Skipping so the repo stays clean." >&2
else
	npm config set init-author-name "Tierney Cyren"
	npm config set init-author-email "hello@bnb.im"
	npm config set init-license "MIT"
	npm config set init-version "0.0.1"

	echo "config:npm - defaults written to ${HOME}/.npmrc"
fi

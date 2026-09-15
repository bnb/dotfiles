# shellcheck shell=bash
# Applies my jujutsu identity to this machine. Sourced by the `config:jj` alias.
#
# Guarded on jj being installed.

if ! command -v jj > /dev/null 2>&1; then
	echo "config:jj - jj (jujutsu) is not installed; skipping." >&2
else
	jj config set --user user.name "Tierney Cyren"
	jj config set --user user.email "hello@bnb.im"

	echo "config:jj - identity set for jj."
fi

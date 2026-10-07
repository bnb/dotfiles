# shellcheck shell=bash
# Copies my git identity into jujutsu's user config. Sourced by the `config:jj`
# alias.
#
# Read from $HOME rather than the current directory, so a work repo's includeIf
# can't hand jj my work email.

if ! command -v jj > /dev/null 2>&1; then
	echo "config:jj - jj (jujutsu) is not installed; skipping." >&2
elif ! _config_jj_name="$(git -C "${HOME}" config user.name)" || ! _config_jj_email="$(git -C "${HOME}" config user.email)"; then
	echo "config:jj - git has no user.name and user.email to copy; skipping." >&2
else
	jj config set --user user.name "${_config_jj_name}"
	jj config set --user user.email "${_config_jj_email}"

	echo "config:jj - identity set for jj: ${_config_jj_name} <${_config_jj_email}>"
fi

unset _config_jj_name _config_jj_email

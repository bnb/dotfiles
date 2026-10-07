# shellcheck shell=bash
# Copies the settings in the repo's .npmrc into this machine's ~/.npmrc.
# Sourced by the `config:npm` alias.
#
# Every shell this repo sets up already reads the repo's .npmrc as npm's global
# config ($NPM_CONFIG_GLOBALCONFIG, in variables.sh). This is for npm started
# from somewhere that isn't one of those shells.

if ! command -v npm > /dev/null 2>&1; then
	echo "config:npm - npm is not installed; skipping." >&2
else
	_config_npm_settings=()
	while IFS= read -r _config_npm_line; do
		_config_npm_settings+=("${_config_npm_line}")
	done < <(grep -v -e '^[[:space:]]*[#;]' -e '^[[:space:]]*$' "${PERSONAL_DOTFILES_PATH}/.npmrc")

	if npm config set "${_config_npm_settings[@]}"; then
		echo "config:npm - ${PERSONAL_DOTFILES_PATH}/.npmrc copied into ${HOME}/.npmrc"
	fi

	unset _config_npm_settings _config_npm_line
fi

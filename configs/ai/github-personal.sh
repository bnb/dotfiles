# shellcheck shell=bash
#
# gh as my own GitHub account. Shared by automation-accounts.sh and
# tracehub.sh, so they agree on who "me" is. Definitions only - sourcing it
# does nothing else.

# gh as me, whatever launched this - from inside an agent session the agents'
# variables are already set, so they're cleared. GH_TOKEN and GITHUB_TOKEN beat
# every gh config directory, so those go too.
gh_personal() {
  env -u GH_CONFIG_DIR -u GIT_CONFIG_GLOBAL -u GH_TOKEN -u GITHUB_TOKEN gh "$@"
}

personal_github_login() {
  gh_personal api user --jq .login 2>/dev/null || true
}

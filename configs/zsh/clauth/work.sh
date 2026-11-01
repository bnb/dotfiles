# start claude on the work clauth profile inside work repos and Gode routines

# Claude in VS Code is a work session because its process wrapper,
# configs/ai/vscode-claude.sh, starts it with `clauth start work`. Terminals
# (Gode's agent sessions included) run plain `claude`, which follows clauth's
# global account, kept on personal. So in ~/GitHub/assistant-ui this sends
# `claude` through the same wrapper, and the session gets the work login,
# claude-work-settings.json and claude-work-mcp.json like VS Code's do.
#
# Gode routines get the same, wherever they run. Gode starts a routine by
# typing `claude` into a login zsh, but tells the session nothing that marks
# it as a routine, so this goes by where it lands: a folder routine runs in
# ~/Routines/<folder>, and a repository routine with a new checkout each run
# is on a `routine/<folder>-<time>` branch.
#
# No flag: it does nothing without a clauth work profile.
if [ ! -f "$HOME/.clauth/profiles/work/config.toml" ]
then
  __personal_debug "skipping the work claude wrapper: no clauth work profile"
  return 0
fi

__personal_debug "wrapping claude for work repos and gode routines"

claude() {
  # inside a `clauth start` session already (CLAUDE_CONFIG_DIR is its
  # per-profile runtime), so the account is settled
  if [ -n "$CLAUDE_CONFIG_DIR" ]
  then
    command claude "$@"
    return
  fi

  local work=false
  case "${PWD:A}/" in
    "${PERSONAL_GITHUB_DIR:A}/assistant-ui/"* | "${HOME:A}/Routines/"*)
      work=true ;;
    *)
      [[ "$(git symbolic-ref --quiet --short HEAD 2>/dev/null)" == routine/* ]] && work=true ;;
  esac

  if $work
  then
    "$PERSONAL_DOTFILES_PATH/configs/ai/vscode-claude.sh" "$(whence -p claude)" "$@"
  else
    command claude "$@"
  fi
}

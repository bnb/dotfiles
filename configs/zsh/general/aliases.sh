# fast-forward a fork's main/master from its upstream.
#
# `upstream` only exists on a fork, and without it git's own error ("'upstream'
# does not appear to be a git repository") doesn't hint at what to do next
__personal_ff() {
  local __personal_ff_branch="$1"

  if ! git remote get-url upstream > /dev/null 2>&1
  then
    print -u2 "ff:$__personal_ff_branch: this repo has no 'upstream' remote - add one with \`git remote add upstream <url>\`"
    return 1
  fi

  git fetch upstream && git checkout "$__personal_ff_branch" && git merge "upstream/$__personal_ff_branch"
}

# helpful commands
alias ff:main="__personal_ff main"
alias ff:master="__personal_ff master"
alias update:dotfiles='git -C "$PERSONAL_DOTFILES_PATH" pull'
alias update:brew="brew update --force --quiet"

alias config:git='source "$PERSONAL_DOTFILES_PATH/configs/zsh/general/config-git.sh"'
alias config:jj='source "$PERSONAL_DOTFILES_PATH/configs/zsh/general/config-jj.sh"'
alias config:npm='source "$PERSONAL_DOTFILES_PATH/configs/zsh/general/config-npm.sh"'
alias node:remotes="git remote get-url origin && git remote set-url origin git@github.com:bnb/node.git && git remote get-url origin && git remote get-url upstream && git remote add upstream git@github.com:nodejs/node.git && git remote get-url upstream"
# single-quoted on purpose: $(brew --prefix) runs when redis:start is invoked,
# not when this file is sourced, so it costs nothing at shell startup
alias redis:start='redis-server "$(brew --prefix)/etc/redis.conf"'
alias redis:stop="redis-cli SHUTDOWN"

# VS Code Insiders is what the setup script installs, so it wins; plain `code`
# and then $EDITOR are the fallbacks, because an unguarded alias here turns
# into "command not found" on any machine without Insiders.
#
# Resolved when the function runs rather than when this file is sourced:
# homebrew's bin directory isn't on $PATH yet this early in the .zshrc, so a
# load-time probe would miss a perfectly good install.
__personal_edit() {
  local __personal_edit_flag="$1"
  shift

  if (( $+commands[code-insiders] ))
  then
    code-insiders "$__personal_edit_flag" "$@"
  elif (( $+commands[code] ))
  then
    code "$__personal_edit_flag" "$@"
  elif [ -n "$EDITOR" ]
  then
    # -r/-a mean nothing outside VS Code so they're dropped, and ${=EDITOR}
    # word-splits so an $EDITOR that carries flags ("code -w") still works
    ${=EDITOR} "$@"
  else
    print -u2 "no editor found - install VS Code Insiders or set \$EDITOR"
    return 1
  fi
}

# short aliases aliases
alias r="__personal_edit -r" # open the passed path in the current VS Code Insiders window, replacing the current contents
alias a="__personal_edit -a" # open the passed path in the current VS Code Insiders workspace
alias i="npx covgen hello@bnb.im && npx license mit && npx gitignore node &&  echo \"package-lock=false\" > .npmrc" # init new project files that can't be init'd by an init command
alias u="update:dotfiles && update:brew"

# --color=auto is GNU syntax. Current macOS ls takes it, but the older BSD ls
# bails with "illegal option", which made every shell on those machines print
# an error the first time anything ran ls. Probe once here rather than wrapping
# ls in a function that re-checks on every single invocation.
if command ls --color=auto /dev/null > /dev/null 2>&1
then
  alias ls="ls --color=auto"
else
  alias ls="ls -G" # BSD's spelling of the same thing
fi

# convert every .wav/.aif/.aiff/.flac under this directory to a 320k .mp3,
# collecting them all into ./mp3

c() {
  setopt local_options extended_glob
  local outdir=mp3
  local src base out converted=0 failed=0
  local -a sources

  # checked up front, before the mkdir below: without this the batch creates an
  # empty ./mp3 and then fails once per file with "command not found"
  if (( ! $+commands[ffmpeg] ))
  then
    print -u2 "c: ffmpeg isn't installed - \`brew install ffmpeg\`"
    return 1
  fi

  # **/ recurses; (#i) catches .WAV off field recorders; (N.) means "skip if
  # nothing matches, and only real files"
  sources=(**/(#i)*.(wav|aif|aiff|flac)(N.))
  # don't re-read anything already sitting in the output directory
  sources=(${sources:#$outdir/*})

  if (( ! $#sources ))
  then
    print "c: no .wav/.aif/.aiff/.flac files found under $PWD"
    return 0
  fi

  mkdir -p "$outdir" || return 1

  local -A seen
  for src in $sources
  do
    base=${${src:t}%.*}

    # everything lands in one flat directory, so two subdirectories holding the
    # same filename would collide - number the later ones. Glob order is stable,
    # so a given source always maps to the same output name: re-running refreshes
    # ./mp3 rather than piling up copies of what's already there.
    if (( ${+seen[$base]} ))
    then
      seen[$base]=$(( seen[$base] + 1 ))
      out="$outdir/$base ($seen[$base]).mp3"
    else
      seen[$base]=1
      out="$outdir/$base.mp3"
    fi

    # -y because otherwise ffmpeg stops and asks before replacing a file, which
    # would strand the whole batch waiting on a prompt
    if ffmpeg -y -i "$src" -ab 320k "$out"
    then
      (( converted++ ))
    else
      print -u2 "c: failed to convert $src"
      (( failed++ ))
    fi
  done

  if (( failed ))
  then
    print -u2 "c: $converted converted into $outdir/, $failed failed"
    return 1
  fi

  print "c: $converted converted into $outdir/"
}

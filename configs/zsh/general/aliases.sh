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

# point a nodejs/node checkout at my fork (origin) and nodejs/node (upstream).
# upstream gets added on a fresh clone and corrected on one that already has it
__personal_node_remotes() {
  git remote set-url origin git@github.com:bnb/node.git || return 1

  if git remote get-url upstream > /dev/null 2>&1
  then
    git remote set-url upstream git@github.com:nodejs/node.git
  else
    git remote add upstream git@github.com:nodejs/node.git
  fi || return 1

  git remote -v
}

# scaffold the files a new project needs that no init command makes. The code
# of conduct's contact is this repo's git email. The packages are pinned, so
# this never runs whatever was last published under those names, and
# package-lock=false is added to an existing .npmrc rather than replacing it
__personal_init_project() {
  local __personal_init_project_email

  if ! __personal_init_project_email="$(git config user.email)"
  then
    print -u2 "i: git has no user.email for the code of conduct"
    return 1
  fi

  npx covgen@3.2.1 "$__personal_init_project_email" &&
    npx license@1.0.3 mit &&
    npx gitignore@0.7.0 node || return 1

  if ! grep -qx 'package-lock=false' .npmrc 2> /dev/null
  then
    # don't glue it onto the end of an unterminated last line
    if [ -s .npmrc ] && [ -n "$(tail -c 1 .npmrc)" ]
    then
      print >> .npmrc
    fi
    print 'package-lock=false' >> .npmrc
  fi
}

# list every alias this shell has, beside what it does: the comment trailing
# its definition in this file if it has one, the command it runs if not. Read
# from the live alias table rather than this file, so ones set anywhere else
# show up too. run-help and which-command are zsh's own defaults, not mine
__personal_aliases() {
  setopt local_options extended_glob
  local line name
  local -i width=0
  local -A notes

  while IFS= read -r line
  do
    [[ "$line" == (#b)[[:space:]]#alias\ ([^=]##)=*\ \#\ (*) ]] && notes[$match[1]]="$match[2]"
  done < "$PERSONAL_DOTFILES_PATH/configs/zsh/general/aliases.sh"

  local -a names=(${(ko)aliases:#(run-help|which-command)})
  for name in $names
  do
    (( $#name > width )) && width=$#name
  done

  for name in $names
  do
    printf '%-*s  %s\n' $width "$name" "${notes[$name]:-$aliases[$name]}"
  done
}

# helpful commands
alias aliases="__personal_aliases" # list my aliases and what each one does
alias ff:main="__personal_ff main"
alias ff:master="__personal_ff master"
alias update:dotfiles='git -C "$PERSONAL_DOTFILES_PATH" pull'
alias update:brew="brew update --force --quiet"

alias config:jj='source "$PERSONAL_DOTFILES_PATH/configs/zsh/general/config-jj.sh"'
alias config:npm='source "$PERSONAL_DOTFILES_PATH/configs/zsh/general/config-npm.sh"'
# run, not sourced like the two above: it's a bash script with subcommands
alias config:ai-github='bash "$PERSONAL_DOTFILES_PATH/configs/ai/automation-accounts.sh" github'
alias config:ai-tangled='bash "$PERSONAL_DOTFILES_PATH/configs/ai/automation-accounts.sh" tangled'
# flip the agents between each forge's bot and my own account
alias toggle:ai-github='bash "$PERSONAL_DOTFILES_PATH/configs/ai/automation-accounts.sh" github toggle'
alias toggle:ai-tangled='bash "$PERSONAL_DOTFILES_PATH/configs/ai/automation-accounts.sh" tangled toggle'
# tracehub for my work checkouts under ~/GitHub/assistant-ui, nowhere else
alias config:tracehub='bash "$PERSONAL_DOTFILES_PATH/configs/ai/tracehub.sh"'
alias toggle:tracehub='bash "$PERSONAL_DOTFILES_PATH/configs/ai/tracehub.sh" toggle'
alias node:remotes="__personal_node_remotes"
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
    # -r/-a/-n mean nothing outside VS Code so they're dropped, and ${=EDITOR}
    # word-splits so an $EDITOR that carries flags ("code -w") still works
    ${=EDITOR} "$@"
  else
    print -u2 "no editor found - install VS Code Insiders or set \$EDITOR"
    return 1
  fi
}

# open a directory (the current one by default) in Ghostty.
#
# on macOS this goes through `open -a` rather than the ghostty binary: launching
# that directly starts a second, separate Ghostty app, while `open` hands the
# directory to the one already running, which opens it per
# macos-dock-drop-behavior (a new tab, unless that's been changed)
__personal_ghostty() {
  local __personal_ghostty_dir="${1:-$PWD}"

  if [ ! -d "$__personal_ghostty_dir" ]
  then
    print -u2 "g: $__personal_ghostty_dir isn't a directory"
    return 1
  fi

  # :A makes it absolute, so a relative path still means the same place to a
  # process that doesn't share this shell's working directory
  __personal_ghostty_dir="${__personal_ghostty_dir:A}"

  if [[ "$OSTYPE" == darwin* ]]
  then
    open -a Ghostty "$__personal_ghostty_dir"
  elif (( $+commands[ghostty] ))
  then
    # &! backgrounds and disowns, so the new window doesn't hold this shell
    # hostage or die with it
    ghostty --working-directory="$__personal_ghostty_dir" > /dev/null 2>&1 &!
  else
    print -u2 "g: ghostty isn't installed"
    return 1
  fi
}

# cd into one of the two trees setup.sh guarantees, or somewhere under it
# (`github bnb/dotfiles`). A function behind the alias rather than a bare
# `cd` alias: with an argument that would be `cd <root> <arg>`, which zsh reads
# as its two-argument "replace this in $PWD" form.
__personal_cd_tree() {
  local __personal_cd_tree_dir="$1${2:+/$2}"

  if [ ! -d "$1" ]
  then
    print -u2 "$1 doesn't exist - run setup.sh, which creates it"
    return 1
  fi

  cd "$__personal_cd_tree_dir"
}

# single-quoted so the variables are read when the alias runs: variables.sh is
# sourced after this file, and a machine can point them somewhere else
alias github='__personal_cd_tree "$PERSONAL_GITHUB_DIR"' # cd to ~/GitHub, or a path under it
alias tangled='__personal_cd_tree "$PERSONAL_TANGLED_DIR"' # cd to ~/tangled, or a path under it

# short aliases
#
# r deliberately replaces zsh's builtin `r` (re-run the last command); that's
# still there as `fc -e -`.
alias r="__personal_edit -r" # open the passed path in the current VS Code Insiders window, replacing the current contents
alias a="__personal_edit -a" # open the passed path in the current VS Code Insiders workspace
alias o="__personal_edit -n" # open the passed path in a new VS Code Insiders window
alias g="__personal_ghostty" # open the passed directory (or the current one) in Ghostty
alias i="__personal_init_project" # init new project files that can't be init'd by an init command
alias u="update:dotfiles && update:brew"

# --color=auto is GNU syntax. Current macOS ls takes it, but the older BSD ls
# bails with "illegal option", which made every shell on those machines print
# an error the first time anything ran ls. -G is the BSD spelling every BSD ls
# understands (GNU reads it as --no-group, so it can't be used everywhere).
# Decided by $OSTYPE rather than by test-running ls, which cost a fork on every
# shell; this runs before brew is on $PATH either way, so it's always the
# system ls being matched.
case "$OSTYPE" in
  darwin*|*bsd*) alias ls="ls -G" ;;
  *)             alias ls="ls --color=auto" ;;
esac

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

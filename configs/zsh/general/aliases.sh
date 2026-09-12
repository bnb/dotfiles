# helpful commands
alias ff:main="git fetch upstream && git checkout main && git merge upstream/main"
alias ff:master="git fetch upstream && git checkout master && git merge upstream/master"
alias update:dotfiles='git -C "$PERSONAL_DOTFILES_PATH" pull'
alias update:brew="brew update --force --quiet"

alias config:git='source "$PERSONAL_DOTFILES_PATH/configs/zsh/general/config-git.sh"'
alias config:jj='source "$PERSONAL_DOTFILES_PATH/configs/zsh/general/config-jj.sh"'
alias config:npm='source "$PERSONAL_DOTFILES_PATH/configs/zsh/general/config-npm.sh"'
alias node:remotes="git remote get-url origin && git remote set-url origin git@github.com:bnb/node.git && git remote get-url origin && git remote get-url upstream && git remote add upstream git@github.com:nodejs/node.git && git remote get-url upstream"
alias redis:start='redis-server "$(brew --prefix)/etc/redis.conf"'
alias redis:stop="redis-cli SHUTDOWN"

# short aliases aliases
alias r="code-insiders -r" # open the passed path in the current VS Code Insiders window, replacing the current contents
alias a="code-insiders -a" # open the passed path in the current VS Code Insiders workspace
alias i="npx covgen hello@bnb.im && npx license mit && npx gitignore node &&  echo \"package-lock=false\" > .npmrc" # init new project files that can't be init'd by an init command
alias u="update:dotfiles && update:brew"
alias ls="ls --color=auto"

# convert every .wav/.aif/.aiff/.flac under this directory to a 320k .mp3,
# collecting them all into ./mp3

c() {
  setopt local_options extended_glob
  local outdir=mp3
  local src base out converted=0 failed=0
  local -a sources

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

# the ssh key I use locally for git and other things.

__personal_ssh_key=""

for __personal_ssh_candidate in \
  "$HOME/.ssh/id_ed25519" \
  "$HOME/.ssh/id_ed25519_sk" \
  "$HOME/.ssh/id_ecdsa" \
  "$HOME/.ssh/id_rsa"
do
  if [ -f "$__personal_ssh_candidate" ]
  then
    __personal_ssh_key="$__personal_ssh_candidate"
    break
  fi
done

if [ -n "$__personal_ssh_key" ]
then
  export SSH_KEY_PATH="$__personal_ssh_key"
else
  __personal_debug "skipping SSH_KEY_PATH: no private key in $HOME/.ssh"
fi

unset __personal_ssh_key __personal_ssh_candidate

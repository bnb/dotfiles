__personal_debug "exporting the cargo bin path"

# `cargo install` puts binaries in $CARGO_HOME/bin (~/.cargo/bin by default).
# rustup adds that to $PATH itself, but `rust` from homebrew doesn't, so
# anything cargo-installed - clauth, for one - was on disk and not on $PATH.
#
# No flag for this: it only adds the directory when it exists, so on a machine
# without cargo it's a no-op.
__personal_cargo_bin="${CARGO_HOME:-$HOME/.cargo}/bin"
if [ -d "$__personal_cargo_bin" ]
then
  path=("$__personal_cargo_bin" $path)
else
  __personal_debug "skipping cargo: $__personal_cargo_bin doesn't exist"
fi
unset __personal_cargo_bin

# brew's rustup is keg-only, so its cargo and rustc proxies sit behind brew's
# `rust` unless they go first. brew's cargo ignores a project's
# rust-toolchain.toml and has no llvm-tools, which `cargo llvm-cov` needs.
if __personal_brew_prefix && [ -d "$__PERSONAL_BREW_PREFIX/opt/rustup/bin" ]
then
  path=("$__PERSONAL_BREW_PREFIX/opt/rustup/bin" $path)
fi

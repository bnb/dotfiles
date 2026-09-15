# `do-release-upgrade` (see upgrade.sh) aborts partway through on WSL when
# snapd is installed, because snapd can't run there. Purging it unblocks the
# upgrade. Only reach for this when the upgrade has actually aborted.
set -uo pipefail

DEBIAN_FRONTEND=noninteractive sudo apt-get purge snapd -y

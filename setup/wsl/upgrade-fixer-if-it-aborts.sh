#!/usr/bin/env bash
#
# `do-release-upgrade` (see upgrade.sh) aborts partway through on WSL when
# snapd is installed, because snapd can't run there. Purging it unblocks the
# upgrade. Only reach for this when the upgrade has actually aborted.
set -uo pipefail

# through `env`, because sudo resets the environment and an exported
# DEBIAN_FRONTEND never reaches apt
sudo env DEBIAN_FRONTEND=noninteractive apt-get purge -y snapd

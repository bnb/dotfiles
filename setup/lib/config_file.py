"""Reading and rewriting the agents' config files, for the inline Python in
setup/lib/common.sh and configs/ai/automation-accounts.sh, so both back up and
write the same way."""

import json
import os
import shutil
import sys
import tempfile
import time


def read(path):
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return ""


def read_json(path):
    """The file's top-level object, or {} for a missing or empty file. Exits
    with a message rather than going near a file that isn't a JSON object."""
    text = read(path)
    try:
        data = json.loads(text) if text.strip() else {}
    except ValueError as e:
        sys.exit("%s isn't valid JSON (%s) - leaving it alone" % (path, e))
    if not isinstance(data, dict):
        sys.exit("%s isn't a JSON object - leaving it alone" % path)
    return data


def write(path, text):
    """Backs the file up to <path>.backup.<timestamp>, the same as setup.sh's
    backup_path, then replaces it in one rename. Through a symlink rather than
    over it, so a config file kept in another repo stays linked. The backup
    still goes next to the link."""
    target = os.path.realpath(path)
    if os.path.exists(target):
        # one setup.sh run can rewrite a file several times a second, and each
        # backup has to survive the next
        backup = stamped = "%s.backup.%s" % (path, time.strftime("%Y%m%d%H%M%S"))
        n = 1
        while os.path.lexists(backup):
            backup = "%s-%d" % (stamped, n)
            n += 1
        shutil.copy2(target, backup)
        perms = os.stat(target).st_mode & 0o777
    else:
        perms = 0o600
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(target), prefix=".dotfiles-")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(text)
    os.chmod(tmp, perms)
    os.replace(tmp, target)


def write_json(path, data, indent=2):
    write(path, json.dumps(data, indent=indent, ensure_ascii=False) + "\n")

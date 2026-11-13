# PreToolUse hook for Bash: refuses commits, pushes and GitHub writes made as
# the other side's identity. a work repo (under ~/GitHub/assistant-ui or with
# an assistant-ui remote, the same test ~/.gitconfig picks my work identity
# by) has to commit with an @assistant-ui.com email, and every other repo
# without one. gh writes have to come from one of my GitHub accounts. git and
# gh only get asked for git commit and push, gh pr create, merge, edit and
# comment, gh issue create and comment, and gh api writes, so every other
# command costs nothing.
import json
import os
import re
import subprocess
import sys

WORK_DIR = os.path.realpath(os.path.expanduser("~/GitHub/assistant-ui"))
WORK_OWNER = "assistant-ui"
WORK_REMOTE = re.compile(r"github\.com[:/]assistant-ui/", re.IGNORECASE)
# configs/git/assistant-ui.gitconfig (mine) and assistant-ui-botandbang.gitconfig
WORK_EMAIL = re.compile(r"@assistant-ui\.com$", re.IGNORECASE)
# there's no separate work GitHub account: work sessions run gh as me and the
# rest as the bot, in work repos and mine alike (configs/ai/README.md), so on
# GitHub this only refuses an account that's neither
GH_LOGINS = {"work": {"bnb", "botandbang"}, "personal": {"bnb", "botandbang"}}

GIT_WRITES = {"commit", "push"}
GH_WRITES = {"pr": {"create", "merge", "edit", "comment"}, "issue": {"create", "comment"}}
API_FIELD_FLAGS = {"-f", "-F", "--field", "--raw-field", "--input"}
VARIABLE = re.compile(r"\$(?:\{(\w+)\}|(\w+))")
API_VALUE_FLAGS =API_FIELD_FLAGS | {"-X", "--method", "-H", "--header", "-q", "--jq", "-t", "--template", "--cache", "-p", "--preview", "--hostname"}


def run(*command):
    result = subprocess.run(command, capture_output=True, text=True, timeout=10)
    return result.stdout.strip() if result.returncode == 0 else None


def repo_side(directory):
    """work or personal, by the repo's git dir and remotes, or None outside a repo"""
    common = run("git", "-C", directory, "rev-parse", "--path-format=absolute", "--git-common-dir")
    if common is None:
        return None
    remotes = run("git", "-C", directory, "config", "--get-regexp", r"^remote\..*\.url$") or ""
    in_work_dir = os.path.realpath(common).startswith(WORK_DIR + os.sep)
    return "work" if in_work_dir or WORK_REMOTE.search(remotes) else "personal"


def wrong_email(directory, side):
    # git var counts GIT_AUTHOR_EMAIL and the like too, which git config doesn't
    for ident in ("GIT_AUTHOR_IDENT", "GIT_COMMITTER_IDENT"):
        email = re.search(r"<([^>]*)>", run("git", "-C", directory, "var", ident) or "")
        email = email.group(1) if email else ""
        if bool(WORK_EMAIL.search(email)) != (side == "work"):
            return "this is a %s repo, but git would commit as %s" % (side, email or "nobody")
    return None


def gh_login():
    # reads gh's own config and GH_TOKEN the way gh itself would
    status = run("gh", "auth", "status", "--active", "--hostname", "github.com", "--json", "hosts")
    return next(host["login"] for host in json.loads(status or "{}")["hosts"]["github.com"] if host["active"])


def endpoint(args):
    previous = ""
    for arg in args:
        if not arg.startswith("-") and previous not in API_VALUE_FLAGS:
            return arg
        previous = arg
    return ""


def gh_write(args):
    """for a gh write, the owner of the repo it names ("" when it names none),
    and None for anything else"""
    group, action = (args + ["", ""])[:2]
    if action in GH_WRITES.get(group, ()):
        repo = next(values(args[2:], {"-R", "--repo"}), "").split("/")
        return repo[-2] if len(repo) > 1 else ""
    if group != "api":
        return None
    path = endpoint(args[1:])
    methods = [method.upper() for method in values(args[1:], {"-X", "--method"})]
    fields = list(values(args[1:], API_FIELD_FLAGS))
    if methods:
        writes = any(method not in ("GET", "HEAD") for method in methods)
    elif path == "graphql":
        # graphql always posts, so only a mutation (or a body this can't read) writes
        writes = any("mutation" in field or "=@" in field for field in fields) or any(values(args[1:], {"--input"}))
    else:
        writes = bool(fields)
    if not writes:
        return None
    owner = re.match(r"/?repos/([^/]+)/", path)
    return owner.group(1) if owner else ""


def check(words, directory):
    """what's wrong with running this command, or None"""
    if words[0] == "git":
        rest, extra = git_command(words)
        if not rest or rest[0] not in GIT_WRITES:
            return None
        if "$" in extra or directory is None and not os.path.isabs(extra):
            return "couldn't tell which repo this runs in. cd to a literal path, or use git -C <path>"
        directory = os.path.join(directory or "", extra)
        side = repo_side(directory)
        # outside a repo git refuses on its own
        return side and wrong_email(directory, side)
    if words[0] == "gh":
        owner = gh_write(words[1:])
        if owner is None:
            return None
        if owner and not owner.startswith("{"):
            side = "work" if owner.lower() == WORK_OWNER else "personal"
        elif directory is None:
            return "couldn't tell which repo this runs in. cd to a literal path, or pass --repo"
        else:
            in_work_dir = os.path.realpath(directory).startswith(WORK_DIR + os.sep)
            side = repo_side(directory) or ("work" if in_work_dir else "personal")
        login = gh_login()
        if login not in GH_LOGINS[side]:
            return "this is a %s repo, but gh would act as %s" % (side, login)
    return None


def main():
    # global, so check() and gh_write() can use them too
    global git_command, values
    try:
        # imported in here so a missing shell_words.py fails closed too
        from shell_words import commands, expand, git_command, values

        event = json.load(sys.stdin)
        command = (event.get("tool_input") or {}).get("command") or ""
        directory = event.get("cwd") or os.getcwd()
        problem, variables = None, {}
        for words in commands(command, variables):
            # the variables this command set itself, the way the shell would fill them in
            words = [VARIABLE.sub(lambda m: variables.get(m.group(1) or m.group(2), m.group(0)), word) for word in words]
            if words[0] == "cd":
                target = expand(words[1]) if len(words) > 1 else os.path.expanduser("~")
                # cd to any other variable, or back with cd -, can't be followed from here
                followable = directory is not None and "$" not in target and target != "-"
                directory = os.path.normpath(os.path.join(directory, target)) if followable else None
                continue
            problem = check(words, directory)
            if problem:
                break
        if not problem:
            return 0
    except Exception as error:
        # fail closed: a command this can't read could be one it should refuse
        print("no-wrong-account couldn't check this command: %r" % error, file=sys.stderr)
        return 2
    print(
        "%s. work repos (under ~/GitHub/assistant-ui, or with an assistant-ui remote) "
        "commit as an @assistant-ui.com email and every other repo as a personal one. "
        "don't override the identity for one command: tell me what git or gh resolved "
        "to here so I can fix the config." % problem,
        file=sys.stderr,
    )
    return 2


sys.exit(main())

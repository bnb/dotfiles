# PreToolUse hook for Bash: refuses the forms of commands that skip their own
# safety check: git worktree remove --force, git branch -D or -d --force,
# git commit --no-verify or -n, and gh pr merge --admin. settings rules can't
# deny these by pattern, since git takes abbreviated long options (--forc) and
# bundled short ones (-df). the deny rules in claude-settings.json stay as a
# second layer, for when this can't run. force-removing a worktree under
# ~/.claude/jobs or /tmp is allowed: those are throwaway checkouts agents make
# for one look, and they were two thirds of what this refused.
import json
import os
import sys

# per command: short options that take the next word as their value when
# nothing's attached, and ones whose value can only be attached
VALUE, ATTACHED_VALUE = 0, 1
SHORT_VALUES = {
    "worktree": ("", ""),
    "branch": ("u", "t"),
    "commit": ("mFCct", "uS"),
    "merge": ("AbFt", ""),
}
# resolved, since /tmp is a link to /private/tmp on macOS
SCRATCH_ROOTS = [os.path.realpath(os.path.expanduser(root)) for root in ("~/.claude/jobs", "/tmp", "/private/tmp")]


def options(args, values):
    args = iter(args)
    for arg in args:
        if arg == "--":
            return
        if arg.startswith("--"):
            yield arg.split("=", 1)[0]
        elif arg.startswith("-"):
            for i, char in enumerate(arg[1:], 1):
                yield "-" + char
                if char in values[VALUE] + values[ATTACHED_VALUE]:
                    if char in values[VALUE] and i == len(arg) - 1:
                        next(args, None)
                    break


def has(args, values, long, short):
    return any(
        opt[1:] in short if len(opt) == 2 else len(opt) > 3 and long.startswith(opt)
        for opt in options(args, SHORT_VALUES[values])
    )


def paths(args):
    args = iter(args)
    for arg in args:
        if arg == "--":
            yield from args
        elif not arg.startswith("-"):
            yield arg


def scratch(path, directory):
    # a relative path only counts when an absolute git -C says where it starts
    path = os.path.join(directory, expand(path))
    return os.path.isabs(path) and any(os.path.realpath(path).startswith(root + os.sep) for root in SCRATCH_ROOTS)


def forced(words):
    rest, directory = git_command(words) if words[0] == "git" else (words[1:], "")
    command = [words[0], *rest]
    if command[:3] == ["git", "worktree", "remove"]:
        targets = list(paths(command[3:]))
        return has(command[3:], "worktree", "--force", "f") and not (
            targets and all(scratch(target, directory) for target in targets)
        )
    if command[:2] == ["git", "branch"]:
        return has(command[2:], "branch", "--delete", "dD") and has(command[2:], "branch", "--force", "Df")
    if command[:2] == ["git", "commit"]:
        return has(command[2:], "commit", "--no-verify", "n")
    if command[:3] == ["gh", "pr", "merge"]:
        return has(command[3:], "merge", "--admin", "")
    return False


def main():
    # global, so forced() and scratch() can use them too
    global expand, git_command
    try:
        # imported in here so a missing shell_words.py fails closed too
        from shell_words import commands, expand, git_command

        command = (json.load(sys.stdin).get("tool_input") or {}).get("command") or ""
        if not any(forced(words) for words in commands(command)):
            return 0
    except Exception as error:
        # fail closed: a command this can't read could be one it should refuse
        print("no-forced-git couldn't check this command: %r" % error, file=sys.stderr)
        return 2
    print(
        "this skips a safety check (force, --no-verify, or --admin). run it without "
        "that, or fix what it refuses on. to remove merged worktrees and branches, "
        "squash-merged ones included, run the repo-cleanup skill's cleanup.py, which "
        "forces only what it has checked. a scratch worktree under ~/.claude/jobs or "
        "/tmp can be force-removed by its absolute path. if anything else still needs "
        "forcing, ask me to run it.",
        file=sys.stderr,
    )
    return 2


sys.exit(main())

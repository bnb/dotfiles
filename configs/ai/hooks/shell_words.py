# splits a Bash command into the commands it runs, for the PreToolUse hooks.
# python puts the hook's real directory on sys.path, so they import this
# through their ~/.claude/hooks symlinks
import os
import re
import shlex

# shell operators, subshell parens and backticks end a command, but only
# outside quotes, so a "fix(ui): ..." message stays one word
OPERATORS = "();<>|&`\n"
# these run the command after them, so that one is what counts
WRAPPERS = {"sudo", "command", "env", "xargs"}
# git's own options that take the next word as their value
GIT_VALUE_OPTIONS = {"-C", "-c", "--git-dir", "--work-tree", "--namespace", "--super-prefix", "--config-env", "--attr-source"}
HOME = re.compile(r"^\$(?:HOME\b|\{HOME\})")


def segments(command):
    lexer = shlex.shlex(command, posix=True, punctuation_chars=OPERATORS)
    lexer.whitespace = " \t\r"
    lexer.whitespace_split = True
    words = []
    try:
        for token in lexer:
            if set(token) <= set(OPERATORS):
                yield words
                words = []
            else:
                words.append(token)
    except ValueError:  # unbalanced quotes
        words += lexer.token.split()
    yield words


def program(word):
    return word.rsplit("/", 1)[-1]


def commands(command, variables=None):
    """each command's words, without the variable assignments, wrappers and
    wrapper flags in front, and with the program named without its path
    (/usr/bin/pkill is pkill). a wrapper option's value (sudo -u root) still
    reads as the command. a variables dict, if given, gains each assignment
    that stands on its own (WT=/path; cd $WT) by the time the commands after
    it come out."""
    for words in segments(command):
        wrapped, assignments = False, []
        while words and (
            "=" in words[0] or program(words[0]) in WRAPPERS or wrapped and words[0].startswith("-")
        ):
            wrapped = wrapped or program(words[0]) in WRAPPERS
            if not wrapped:
                assignments.append(words[0].split("=", 1))
            words.pop(0)
        if words:
            yield [program(words[0]), *words[1:]]
        elif variables is not None:
            variables.update(assignments)


def values(args, flags):
    """the values given to any of these flags, in -f v, -fv, --flag v and
    --flag=v forms"""
    args = iter(args)
    for arg in args:
        flag, _, attached = arg.partition("=") if arg.startswith("--") else (arg[:2], "", arg[2:])
        if flag in flags:
            yield attached or next(args, "")


def expand(path):
    """a path with the ~ or $HOME in front expanded, as the shell would have"""
    return os.path.expanduser(HOME.sub(lambda _: os.path.expanduser("~"), path))


def git_command(words):
    """a git command's words from the subcommand on, without git's own options,
    and the directory its -C options add up to ("" when there's none)"""
    rest, directory = words[1:], ""
    while rest and rest[0].startswith("-"):
        if rest[0] == "-C" and len(rest) > 1:
            directory = os.path.join(directory, expand(rest[1]))
        rest = rest[2:] if rest[0] in GIT_VALUE_OPTIONS else rest[1:]
    return rest, directory

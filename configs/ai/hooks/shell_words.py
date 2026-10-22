# splits a Bash command into the commands it runs, for the PreToolUse hooks.
# python puts the hook's real directory on sys.path, so they import this
# through their ~/.claude/hooks symlinks
import shlex

# shell operators, subshell parens and backticks end a command, but only
# outside quotes, so a "fix(ui): ..." message stays one word
OPERATORS = "();<>|&`\n"
# these run the command after them, so that one is what counts
WRAPPERS = {"sudo", "command", "env", "xargs"}


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


def commands(command):
    """each command's words, without the variable assignments, wrappers and
    wrapper flags in front, and with the program named without its path
    (/usr/bin/pkill is pkill). a wrapper option's value (sudo -u root) still
    reads as the command."""
    for words in segments(command):
        wrapped = False
        while words and (
            "=" in words[0] or program(words[0]) in WRAPPERS or wrapped and words[0].startswith("-")
        ):
            wrapped = wrapped or program(words[0]) in WRAPPERS
            words.pop(0)
        if words:
            yield [program(words[0]), *words[1:]]

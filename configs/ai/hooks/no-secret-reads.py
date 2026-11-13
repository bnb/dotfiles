# PreToolUse hook for Bash: refuses commands that would print secret values
# into the transcript. that's keychain passwords, and dumping a .env file or a
# clauth profile's config or tokens with cat, head, and the like. filters that
# print only key names (rg -o, awk -F=) still run.
import json
import re
import sys

KEYCHAIN = re.compile(r"\bsecurity\s+find-(?:generic|internet)-password\b[^|;&\n]*\s-[A-Za-z]*[wg][A-Za-z]*\b")
DUMPERS = {"cat", "bat", "less", "more", "head", "tail", "nl", "strings", "xxd", "hexdump", "od", "tac"}
SECRET_FILE = re.compile(
    r"\.clauth/profiles/[^\s'\"]*/(?:config\.toml|credentials\.json|session-token\.json)"
    r"|(?:^|[\s/'\"=])\.env(?:\.(?!example\b|sample\b|template\b|dist\b)[\w.-]+)?(?=$|[\s'\";|&)*?\[])"
)


def dumps_secret(words):
    return words[0] in DUMPERS and bool(SECRET_FILE.search(" ".join(words)))


def main():
    try:
        # imported in here so a missing shell_words.py fails closed too
        from shell_words import commands

        command = (json.load(sys.stdin).get("tool_input") or {}).get("command") or ""
        if not KEYCHAIN.search(command) and not any(dumps_secret(words) for words in commands(command)):
            return 0
    except Exception as error:
        # fail closed: a command this can't read could be one it should refuse
        print("no-secret-reads couldn't check this command: %r" % error, file=sys.stderr)
        return 2
    print(
        "this would print secret values into the transcript. read key names only, "
        "for example: rg -o '^\\s*[A-Za-z_][A-Za-z0-9_]*\\s*=' <file>. if you need "
        "a value, pass it to the command that uses it without echoing it.",
        file=sys.stderr,
    )
    return 2


sys.exit(main())

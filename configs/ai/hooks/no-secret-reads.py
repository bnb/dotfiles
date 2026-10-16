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
    r"|(?:^|[\s/'\"=])\.env(?:\.(?!example\b|sample\b|template\b|dist\b)[\w.-]+)?(?=$|[\s'\";|&)])"
)
SEGMENT = re.compile(r"\|\|?|&&|;|\n")


def dumps_secret(segment):
    words = segment.split()
    while words and ("=" in words[0] or words[0] in {"sudo", "command", "env"}):
        words.pop(0)
    return bool(words) and words[0].rsplit("/", 1)[-1] in DUMPERS and bool(SECRET_FILE.search(segment))


def main():
    event = json.load(sys.stdin)
    command = (event.get("tool_input") or {}).get("command") or ""
    if not KEYCHAIN.search(command) and not any(dumps_secret(s) for s in SEGMENT.split(command)):
        return 0
    print(
        "this would print secret values into the transcript. read key names only, "
        "for example: rg -o '^\\s*[A-Za-z_][A-Za-z0-9_]*\\s*=' <file>. if you need "
        "a value, pass it to the command that uses it without echoing it.",
        file=sys.stderr,
    )
    return 2


sys.exit(main())

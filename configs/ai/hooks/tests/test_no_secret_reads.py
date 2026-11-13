"""no-secret-reads.py as Claude Code runs it. run: python3 -m unittest discover <this dir>"""

import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

HOOK = Path(__file__).parent.parent / "no-secret-reads.py"


def run(command, hook=HOOK):
    event = json.dumps({"tool_name": "Bash", "tool_input": {"command": command}})
    return subprocess.run(["python3", str(hook)], input=event, capture_output=True, text=True)


class NoSecretReads(unittest.TestCase):
    def test_refuses_printing_secrets(self):
        for command in [
            "security find-generic-password -s github -w",
            "security find-internet-password -a me -s example.com -g",
            "security find-generic-password -wa me",
            "cat .env",
            "cat apps/web/.env.local",
            "head -5 '.env.production'",
            "tail -n 20 /repo/.env",
            "cd apps/web && less .env.local",
            "sudo cat .env",
            "/bin/cat .env",
            "cat ~/.clauth/profiles/work/config.toml",
            "strings ~/.clauth/profiles/personal/credentials.json",
            "xxd ~/.clauth/profiles/work/session-token.json",
        ]:
            with self.subTest(command=command):
                result = run(command)
                self.assertEqual(result.returncode, 2, command)
                self.assertIn("secret values", result.stderr)

    def test_allows_key_names_and_examples(self):
        for command in [
            "rg -o '^\\s*[A-Za-z_][A-Za-z0-9_]*\\s*=' .env",
            "awk -F= '{print $1}' .env.local",
            "cat .env.example",
            "cat apps/web/.env.sample",
            "cat .env.template",
            "security find-generic-password -s github",
            "cat ~/.clauth/profiles/work/settings.json",
            "cat README.md",
            "echo .env",
            "",
        ]:
            with self.subTest(command=command):
                result = run(command)
                self.assertEqual(result.returncode, 0, command)
                self.assertEqual(result.stderr, "")

    def test_fails_closed_on_input_it_cant_read(self):
        result = subprocess.run(["python3", str(HOOK)], input="not json", capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("couldn't check", result.stderr)

    def test_fails_closed_without_shell_words(self):
        # a copy, not a link, so shell_words.py isn't next to it
        with tempfile.TemporaryDirectory() as tmp:
            alone = Path(tmp, HOOK.name)
            shutil.copy(HOOK, alone)
            result = run("cat .env.example", hook=alone)
            self.assertEqual(result.returncode, 2)
            self.assertIn("couldn't check", result.stderr)


if __name__ == "__main__":
    unittest.main()

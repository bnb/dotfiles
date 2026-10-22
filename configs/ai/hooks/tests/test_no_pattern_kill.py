"""no-pattern-kill.py as Claude Code runs it. run: python3 -m unittest discover <this dir>"""

import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

HOOK = Path(__file__).parent.parent / "no-pattern-kill.py"


def run(command, hook=HOOK):
    event = json.dumps({"tool_name": "Bash", "tool_input": {"command": command}})
    return subprocess.run(["python3", str(hook)], input=event, capture_output=True, text=True)


class NoPatternKill(unittest.TestCase):
    def assert_refused(self, command, hook=HOOK):
        result = run(command, hook)
        self.assertEqual(result.returncode, 2, command)
        self.assertIn("PID or process group", result.stderr)

    def assert_allowed(self, command):
        result = run(command)
        self.assertEqual(result.returncode, 0, command)
        self.assertEqual(result.stderr, "")

    def test_refuses_pkill_and_killall(self):
        for command in [
            "pkill node",
            "pkill -f cargo-nextest",
            "pkill -9 -f 'vite --port 5173'",
            "killall node",
            "/usr/bin/pkill -f nextest",
            "sudo pkill -f nextest",
            "cd /tmp && pkill -f nextest",
            "true; killall -9 cargo",
            "pgrep -f vite | xargs pkill",
            "FOO=1 env -i pkill vite",
            "(killall node)",
        ]:
            with self.subTest(command=command):
                self.assert_refused(command)

    def test_allows_kill_by_pid_and_the_word_as_an_argument(self):
        for command in [
            "kill 1234",
            "kill -TERM -- -4321",
            "echo pkill",
            "echo 'pkill -f x && killall y'",
            "rg pkill",
            "rg -n killall configs/",
            "git commit -m 'fix: stop using pkill'",
            "",
        ]:
            with self.subTest(command=command):
                self.assert_allowed(command)

    def test_works_through_a_symlink(self):
        # setup.sh links the hooks into ~/.claude/hooks one by one, without
        # shell_words.py next to the link
        with tempfile.TemporaryDirectory() as tmp:
            link = Path(tmp, HOOK.name)
            os.symlink(HOOK, link)
            self.assert_refused("pkill -f nextest", hook=link)

    def test_fails_closed_on_input_it_cant_read(self):
        result = subprocess.run(["python3", str(HOOK)], input="not json", capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("couldn't check", result.stderr)


if __name__ == "__main__":
    unittest.main()

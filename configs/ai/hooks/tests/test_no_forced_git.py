"""no-forced-git.py as Claude Code runs it. run: python3 -m unittest discover <this dir>"""

import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

HOOK = Path(__file__).parent.parent / "no-forced-git.py"


class NoForcedGit(unittest.TestCase):
    def setUp(self):
        # next to the tests rather than in the temp dir, which is /tmp on Linux
        home = tempfile.TemporaryDirectory(dir=Path(__file__).parent)
        self.addCleanup(home.cleanup)
        self.home = home.name

    def run_hook(self, command):
        event = json.dumps({"tool_name": "Bash", "tool_input": {"command": command}})
        env = dict(os.environ, HOME=self.home)
        return subprocess.run(["python3", str(HOOK)], input=event, capture_output=True, text=True, env=env)

    def assert_refused(self, command):
        result = self.run_hook(command)
        self.assertEqual(result.returncode, 2, command)
        self.assertIn("skips a safety check", result.stderr)

    def assert_allowed(self, command):
        result = self.run_hook(command)
        self.assertEqual(result.returncode, 0, command)
        self.assertEqual(result.stderr, "")

    def test_refuses_skipping_the_check(self):
        for command in [
            "git worktree remove --force .claude/worktrees/x",
            "git worktree remove -f ../x",
            "git worktree remove --forc x",
            "git worktree remove x -ff",
            "git -C repo worktree remove -f x",
            "git -c core.x=1 worktree remove --force x",
            "git branch -D bnb/x",
            "git branch -d --force bnb/x",
            "git branch -df bnb/x",
            "git branch --delete --force bnb/x",
            "git branch --del --forc bnb/x",
            "git commit -n -m x",
            "git commit --no-verify -m x",
            "git commit --no-ver -m x",
            "git commit -am x -n",
            "gh pr merge 1 --admin",
            "gh pr merge 1 --squash --adm",
            "cd /repo && git branch -D x",
            "true; git commit -nm x",
        ]:
            with self.subTest(command=command):
                self.assert_refused(command)

    def test_refuses_forcing_a_worktree_outside_scratch(self):
        for command in [
            "git worktree remove --force /tmp/../Users/me/repo/.claude/worktrees/x",
            "git worktree remove --force ~/.claude/worktrees/x",
            "git worktree remove --force ~/GitHub/repo/.claude/worktrees/x",
            "git worktree remove --force $S",
            "git worktree remove --force",
            "git worktree remove --force /tmp/x /Users/me/repo/x",
            "git -C repo worktree remove --force x",
            "git worktree remove --force /tmp/x && git branch -D x",
        ]:
            with self.subTest(command=command):
                self.assert_refused(command)

    def test_refuses_a_scratch_link_to_somewhere_else(self):
        with tempfile.TemporaryDirectory(dir="/tmp") as tmp:
            link = Path(tmp, "wt")
            os.symlink(self.home, link)
            self.assert_refused("git worktree remove --force %s" % link)

    def test_allows_forcing_a_scratch_worktree(self):
        for command in [
            "git worktree remove --force /tmp/wt",
            "git worktree remove -f /private/tmp/claude-501/x/scratchpad/wt",
            "git worktree remove --force %s/.claude/jobs/abc/tmp/base" % self.home,
            "git worktree remove --force ~/.claude/jobs/abc/tmp/base",
            "git worktree remove --force $HOME/.claude/jobs/abc/tmp/base",
            "git worktree remove -f -f ${HOME}/.claude/jobs/abc/tmp/base",
            "git -C /tmp/repo worktree remove --force wt",
            "cd ~/GitHub/repo && git worktree remove --force -- /tmp/wt",
        ]:
            with self.subTest(command=command):
                self.assert_allowed(command)

    def test_allows_the_checked_forms(self):
        for command in [
            "git worktree remove .claude/worktrees/x",
            "git branch -d bnb/x",
            "git branch --delete bnb/x",
            "git branch -f bnb/x main",
            "git commit -m x",
            "git commit -m -n",
            "git commit -m 'fix: drop --no-verify'",
            "git commit -C HEAD",
            "gh pr merge 1 --squash",
            "echo git branch -D x",
            "",
        ]:
            with self.subTest(command=command):
                self.assert_allowed(command)

    def test_fails_closed_on_input_it_cant_read(self):
        result = subprocess.run(["python3", str(HOOK)], input="not json", capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("couldn't check", result.stderr)


if __name__ == "__main__":
    unittest.main()

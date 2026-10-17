#!/usr/bin/env python3
"""Find merged git worktrees and branches, and Rust build output nobody is
using, in one or more repos. Prints a report; --apply removes what the report
marks "remove" and "clean build", rechecking each item right before it acts.

Never touched: anything with uncommitted files, commits the default branch
doesn't have, a running process inside, or ignored files that aren't build
output (those are listed under "review" until --include names them).
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

# ignored paths with one of these as a component are rebuildable, so losing
# them with a worktree is fine. anything else ignored (.env files, local
# databases) gets a look first.
DISPOSABLE = {
    ".astro", ".cache", ".eslintcache", ".hegel", ".lighthouseci", ".mypy_cache",
    ".next", ".nuxt", ".output", ".parcel-cache", ".pytest_cache", ".ruff_cache",
    ".svelte-kit", ".turbo", ".venv", ".vite", ".wrangler", "__pycache__",
    "build", "coverage", "dist", "lighthouse-report", "node_modules",
    "playwright-report", "storybook-static", "target", "test-results", ".DS_Store",
}
DISPOSABLE_SUFFIXES = (".log", ".tsbuildinfo")
# a branch with no commits of its own may have just been made for new work
FRESH_SECONDS = 3 * 86400
# build output written this recently probably belongs to a build in progress
BUILDING_SECONDS = 3600


def run(cmd, cwd=None, check=True):
    result = subprocess.run(
        cmd, cwd=cwd, capture_output=True, text=True,
        env={**os.environ, "GIT_OPTIONAL_LOCKS": "0"},
    )
    return result.stdout.strip() if result.returncode == 0 or not check else None


def git(repo, *args):
    return run(["git", "-C", str(repo), *args])


def plural(n, word):
    return f"{n} {word}{'' if n == 1 else 's'}"


def human(kib):
    return f"{kib / 1024 ** 2:.1f}G" if kib >= 1024 ** 2 else f"{kib / 1024:.0f}M"


def live_processes():
    """(pid, command, cwd) for each of this user's processes."""
    procs = []
    if shutil.which("lsof"):
        # lsof exits 1 when it can't read some process, so take what it printed.
        # run from / so lsof itself doesn't show up in the caller's worktree
        out = run(["lsof", "-a", "-d", "cwd", "-u", str(os.getuid()), "-Fpcn"], cwd="/", check=False) or ""
        pid = cmd = None
        for line in out.splitlines():
            tag, value = line[:1], line[1:]
            if tag == "p":
                pid, cmd = int(value), None
            elif tag == "c":
                cmd = value
            elif tag == "n":
                procs.append((pid, cmd, value))
    elif Path("/proc").is_dir():
        for entry in Path("/proc").iterdir():
            if not entry.name.isdigit():
                continue
            try:
                cwd = os.readlink(entry / "cwd")
                cmd = (entry / "comm").read_text().strip()
            except OSError:
                continue
            procs.append((int(entry.name), cmd, cwd))
    return procs


def ancestors():
    """This process and the ones that started it: the shell and agent session
    running the cleanup, which shouldn't keep their own worktree in use."""
    pids, pid = set(), os.getpid()
    while pid > 1 and pid not in pids:
        pids.add(pid)
        pid = int(run(["ps", "-o", "ppid=", "-p", str(pid)]) or 1)
    return pids


SELF = ancestors()


def inside(path, procs):
    root = os.path.realpath(path)
    return [(pid, cmd) for pid, cmd, cwd in procs
            if pid not in SELF and (cwd == root or cwd.startswith(root + os.sep))]


def lock_reason(reason):
    """Claude Code locks its worktrees with "... (pid N start ...)", so say
    when that process is gone and the lock is likely stale."""
    match = re.search(r"\bpid (\d+)", reason)
    if match:
        try:
            os.kill(int(match.group(1)), 0)
        except ProcessLookupError:
            return f"locked by pid {match.group(1)}, which isn't running (git worktree unlock if it's stale)"
        except PermissionError:
            pass
    return f"locked ({reason})" if reason else "locked"


CARGO_TAG = "Signature: 8a477f597d28d172789f06886806bc55"


def is_cargo_target(root, here):
    """Cargo's CACHEDIR.TAG alone could be planted anywhere, so also require
    git to ignore the dir, which it won't while anything inside is tracked."""
    tag = (here / "CACHEDIR.TAG").read_text(errors="ignore")
    return (tag.startswith(CARGO_TAG) and "cargo" in tag
            and git(root, "check-ignore", "-q", f"{here.relative_to(root)}/") is not None)


def cargo_targets(root):
    """Cargo target dirs a few levels down, skipping node_modules and nested
    worktrees or repos."""
    found = []
    root = Path(root)
    for dirpath, dirnames, filenames in os.walk(root):
        here = Path(dirpath)
        if here != root and (".git" in dirnames or ".git" in filenames):
            dirnames.clear()
            continue
        if "CACHEDIR.TAG" in filenames and here != root and is_cargo_target(root, here):
            found.append(here)
            dirnames.clear()
            continue
        if len(here.relative_to(root).parts) >= 4:
            dirnames.clear()
        dirnames[:] = [d for d in dirnames if d not in (".git", "node_modules")]
    return found


def newest_mtime(path, depth=2):
    newest = path.stat().st_mtime
    if depth:
        for child in path.iterdir():
            if child.is_dir() and not child.is_symlink():
                newest = max(newest, newest_mtime(child, depth - 1))
    return newest


def size_kib(path):
    out = run(["du", "-sk", str(path)])
    return int(out.split()[0]) if out else 0


def notable_ignored(worktree, main):
    """Ignored paths that aren't build output, each marked when the main
    checkout has an identical copy, since then nothing would be lost."""
    out = git(worktree, "ls-files", "--others", "--ignored", "--exclude-standard", "--directory", "-z") or ""
    notable = []
    for path in filter(None, out.split("\0")):
        parts = Path(path.rstrip("/")).parts
        if any(p in DISPOSABLE or p.endswith(DISPOSABLE_SUFFIXES) for p in parts):
            continue
        here, there = Path(worktree, path), Path(main, path)
        same = here.is_file() and there.is_file() and here.read_bytes() == there.read_bytes()
        notable.append(f"{path} (same in main checkout)" if same else path)
    return notable


class Repo:
    def __init__(self, path, fetch):
        self.main = Path(git(path, "worktree", "list", "--porcelain").split("\n", 1)[0].split(" ", 1)[1])
        self.notes = []
        if fetch and git(self.main, "remote", "get-url", "origin") is not None:
            if git(self.main, "fetch", "--quiet", "--prune", "origin") is None:
                self.notes.append("git fetch failed, so remote state may be stale")
        self.default = next(
            ref for ref in (
                git(self.main, "symbolic-ref", "--short", "refs/remotes/origin/HEAD"),
                "origin/main", "origin/master", "main", "master",
            )
            if ref and git(self.main, "rev-parse", "--verify", "--quiet", ref)
        )
        self.first_parent = set((git(self.main, "rev-list", "--first-parent", "--max-count=50000", self.default) or "").split())
        self.pr_heads = self._merged_pr_heads()

    def _merged_pr_heads(self):
        url = git(self.main, "remote", "get-url", "origin") or ""
        if "github.com" not in url or not shutil.which("gh"):
            return {}
        out = run(["gh", "pr", "list", "--state", "merged", "--limit", "500", "--json", "headRefName,headRefOid"], cwd=self.main)
        if out is None:
            self.notes.append("couldn't list merged PRs with gh, so squash-merged branches show as unmerged")
            return {}
        heads = {}
        for pr in json.loads(out):
            heads.setdefault(pr["headRefName"], set()).add(pr["headRefOid"])
        return heads

    def merge_state(self, head, branch):
        """("merged" | "empty" | "unmerged", why)."""
        if branch and head in self.pr_heads.get(branch, ()):
            return "merged", "PR merged"
        if git(self.main, "merge-base", "--is-ancestor", head, self.default) is None:
            ahead = int(git(self.main, "rev-list", "--count", f"{self.default}..{head}"))
            return "unmerged", f"{plural(ahead, 'commit')} not in {self.default}, {self.pushed(head, branch)}"
        if head in self.first_parent:
            return "empty", "no commits of its own"
        return "merged", f"merged into {self.default}"

    def pushed(self, head, branch):
        """Whether origin has this work, which matters more than merged when
        someone thinks it's out for review."""
        remote = f"refs/remotes/origin/{branch}"
        if not branch or not git(self.main, "rev-parse", "--verify", "--quiet", remote):
            return "not on origin"
        unpushed = int(git(self.main, "rev-list", "--count", f"{remote}..{head}"))
        return f"{plural(unpushed, 'commit')} not pushed" if unpushed else "pushed"

    def age(self, repo_path, ref):
        """Seconds since the ref last moved. Its reflog says when it was made;
        the commit it points at doesn't, since an empty branch points at the
        default branch's own commit."""
        # %gd with --date=unix is "<ref>@{<time of the entry>}"
        entry = git(repo_path, "log", "-g", "-1", "--date=unix", "--format=%gd", ref)
        moved = entry.rsplit("@{", 1)[1].rstrip("}") if entry else git(repo_path, "log", "-1", "--format=%ct", ref)
        return time.time() - int(moved or 0)


def survey(repo, procs):
    items = []
    checked_out = set()
    for block in git(repo.main, "worktree", "list", "--porcelain").split("\n\n"):
        fields = dict((line.split(" ", 1) + [""])[:2] for line in block.splitlines() if line)
        path = Path(fields["worktree"])
        branch = fields.get("branch", "").removeprefix("refs/heads/") or None
        checked_out.add(branch)
        if "prunable" in fields:
            # pruning only drops git's record; the branch gets judged on the next run
            items.append({"kind": "worktree", "path": str(path), "action": "remove", "why": f"directory is gone ({branch or 'detached'})"})
            continue
        live = inside(path, procs)

        for target in cargo_targets(path):
            building = time.time() - newest_mtime(target) < BUILDING_SECONDS
            why = "built in the last hour" if building else "process inside" if live else "no process inside"
            items.append({"kind": "build output", "path": str(target), "worktree": str(path), "size_kib": size_kib(target),
                          "action": "keep" if live or building else "clean build", "why": why})

        if path == repo.main:
            behind = int(git(path, "rev-list", "--count", f"HEAD..{repo.default}") or 0)
            if branch and behind:
                repo.notes.append(f"main checkout ({branch}) is {plural(behind, 'commit')} behind {repo.default}")
            continue

        item = {"kind": "worktree", "path": str(path), "branch": branch, "head": fields["HEAD"]}
        reasons = []
        if live:
            reasons.append("in use by " + ", ".join(f"{cmd} ({pid})" for pid, cmd in live[:3]))
        dirty = len((git(path, "status", "--porcelain") or "").splitlines())
        if dirty:
            reasons.append(plural(dirty, "uncommitted file"))
        if "locked" in fields:
            reasons.append(lock_reason(fields["locked"]))
        state, why = repo.merge_state(fields["HEAD"], branch)
        if state == "unmerged":
            reasons.append(why)
        elif state == "empty" and repo.age(path, branch or "HEAD") < FRESH_SECONDS:
            reasons.append("new branch with no commits yet")
        item["why"] = "; ".join(reasons) or why
        if reasons:
            item["action"] = "keep"
        else:
            notable = notable_ignored(path, repo.main)
            item["action"] = "review" if notable else "remove"
            if notable:
                item["ignored"] = notable
        items.append(item)

    default_local = repo.default.removeprefix("origin/")
    for line in (git(repo.main, "for-each-ref", "refs/heads", "--format=%(refname:short) %(objectname)") or "").splitlines():
        branch, head = line.split()
        if branch in checked_out or branch == default_local:
            continue
        state, why = repo.merge_state(head, branch)
        fresh = state == "empty" and repo.age(repo.main, f"refs/heads/{branch}") < FRESH_SECONDS
        action = "keep" if state == "unmerged" or fresh else "remove"
        items.append({"kind": "branch", "branch": branch, "head": head, "action": action,
                      "why": "new branch with no commits yet" if fresh else why})

    for item in items:
        branch = item.get("branch")
        if item["action"] in ("remove", "review") and branch and git(repo.main, "rev-parse", "--verify", "--quiet", f"refs/remotes/origin/{branch}"):
            repo.notes.append(f"origin still has {branch}")
    stashes = git(repo.main, "stash", "list", "--format=%gd (%cr) %gs") or ""
    repo.notes.extend(f"stash: {s}" for s in stashes.splitlines())
    return items


def describe(item):
    where = item.get("path") or item["branch"]
    parts = [item["kind"], where]
    if item.get("branch") and item.get("path"):
        parts.append(item["branch"])
    if "size_kib" in item:
        parts.append(human(item["size_kib"]))
    parts.append(item["why"])
    if item.get("ignored"):
        parts.append("ignored files that would go: " + ", ".join(item["ignored"][:6]))
    return "  " + "  ".join(parts)


def print_report(repo, items):
    print(f"repo: {repo.main} (default {repo.default})")
    for action, heading in (
        ("remove", "remove"),
        ("clean build", "clean build output"),
        ("review", "review (merged and clean, look at the ignored files, then pass --include)"),
        ("keep", "keep"),
    ):
        group = [i for i in items if i["action"] == action]
        if group:
            print(f"{heading}:")
            for item in group:
                print(describe(item))
    if repo.notes:
        print("notes:")
        for note in repo.notes:
            print(f"  {note}")


def log(message):
    # with --json, stdout is only the JSON
    print(message, file=LOG)


LOG = sys.stdout


def apply(repo, items):
    """Returns the KiB it removed."""
    procs = live_processes()
    freed = 0
    for item in items:
        if item["action"] == "clean build":
            target = Path(item["path"])
            if inside(item["worktree"], procs) or time.time() - newest_mtime(target) < BUILDING_SECONDS:
                log(f"skipped {target}: in use now")
                continue
            shutil.rmtree(target, ignore_errors=True)
            freed += item["size_kib"]
            log(f"cleaned {target} ({human(item['size_kib'])})")

    for item in items:
        if item["action"] != "remove":
            continue
        branch = item.get("branch")
        if item["kind"] == "worktree" and item.get("head"):
            path = item["path"]
            now_head = git(path, "rev-parse", "HEAD")
            if now_head != item["head"] or inside(path, procs):
                log(f"skipped {path}: changed since the survey")
                continue
            kib = size_kib(path)
            # without --force, git refuses a worktree with changes made since the survey
            if git(repo.main, "worktree", "remove", path) is None:
                log(f"skipped {path}: git worktree remove refused")
                continue
            freed += kib
            log(f"removed worktree {path} ({human(kib)})")
        if branch and item["kind"] in ("worktree", "branch"):
            if item.get("head") and git(repo.main, "rev-parse", f"refs/heads/{branch}") != item["head"]:
                log(f"kept branch {branch}: it moved since the survey")
                continue
            if git(repo.main, "branch", "-D", branch) is not None:
                log(f"deleted branch {branch}")
    git(repo.main, "worktree", "prune")
    return freed


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("repos", nargs="*", default=["."], help="any path inside each repo (default: .)")
    parser.add_argument("--apply", action="store_true", help="remove what the report marks remove and clean build")
    parser.add_argument("--include", action="append", default=[], metavar="PATH_OR_BRANCH",
                        help="treat a reviewed item as remove (repeatable)")
    parser.add_argument("--no-fetch", action="store_true", help="skip git fetch --prune")
    parser.add_argument("--json", action="store_true", help="print the survey as JSON")
    args = parser.parse_args()
    global LOG
    LOG = sys.stderr if args.json else sys.stdout

    included = {os.path.realpath(i) if os.path.exists(i) else i for i in args.include}
    procs = live_processes()
    if args.apply and os.getpid() not in {pid for pid, _, _ in procs}:
        # this process always has a cwd, so missing it means process detection
        # failed and "no process inside" can't be trusted
        print("couldn't list running processes, so nothing was removed", file=sys.stderr)
        return 1
    report = []
    freed = 0
    for path in args.repos:
        if git(path, "rev-parse", "--git-dir") is None:
            print(f"{path}: not a git repo", file=sys.stderr)
            return 1
        repo = Repo(path, fetch=not args.no_fetch)
        items = survey(repo, procs)
        for item in items:
            if item["action"] == "review" and ({item.get("path"), item.get("branch")} & included):
                item["action"] = "remove"
        report.append({"repo": str(repo.main), "default": repo.default, "items": items, "notes": repo.notes})
        if not args.json:
            print_report(repo, items)
        if args.apply:
            log("applying:")
            freed += apply(repo, items)

    if args.json:
        print(json.dumps(report, indent=2))
    if args.apply:
        log(f"freed {human(freed)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

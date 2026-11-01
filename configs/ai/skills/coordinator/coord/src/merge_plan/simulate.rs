//! In-memory merges with `git merge-tree`, and dangling commits standing in for landed heads.

use anyhow::{Result, bail};
use indexmap::IndexSet;
use rustc_hash::FxHashMap;

use crate::git::Git;

/// How merging one commit into another went.
#[derive(Debug, Clone)]
pub struct Merge {
    pub tree: String,
    pub clean: bool,
    pub conflicts: Vec<String>,
}

/// Fixed identity and dates so the same merge always makes the same commit id.
const SIMULATION_ENV: [(&str, &str); 6] = [
    ("GIT_AUTHOR_NAME", "coord"),
    ("GIT_AUTHOR_EMAIL", "coord@localhost"),
    ("GIT_COMMITTER_NAME", "coord"),
    ("GIT_COMMITTER_EMAIL", "coord@localhost"),
    ("GIT_AUTHOR_DATE", "946684800 +0000"),
    ("GIT_COMMITTER_DATE", "946684800 +0000"),
];

/// Merges and lands commits, remembering results since the auto order asks about the same
/// pairs again.
pub struct Simulator<'a> {
    git: &'a Git,
    merges: FxHashMap<(String, String), Merge>,
    landings: FxHashMap<(String, String), String>,
}

impl<'a> Simulator<'a> {
    pub fn new(git: &'a Git) -> Self {
        Self { git, merges: FxHashMap::default(), landings: FxHashMap::default() }
    }

    /// Merges `theirs` into `ours` without touching any ref, the index, or a worktree.
    pub fn merge(&mut self, ours: &str, theirs: &str) -> Result<Merge> {
        let key = (ours.to_owned(), theirs.to_owned());
        if let Some(merge) = self.merges.get(&key) {
            return Ok(merge.clone());
        }
        let output =
            self.git.raw(&["merge-tree", "--write-tree", "--name-only", "--no-messages", ours, theirs], &[])?;
        if output.code > 1 {
            bail!("git merge-tree {ours} {theirs} exited {}: {}", output.code, output.stderr.trim());
        }
        let mut lines = output.stdout.lines();
        let tree = lines.next().unwrap_or_default().to_owned();
        // A path conflicted in several ways is listed once per stage.
        let conflicts: IndexSet<String> = lines.take_while(|line| !line.is_empty()).map(str::to_owned).collect();
        let merge = Merge { tree, clean: output.code == 0, conflicts: conflicts.into_iter().collect() };
        self.merges.insert(key, merge.clone());
        Ok(merge)
    }

    /// Lands `head` on `tip`: the new tip when it merges cleanly, `None` when it conflicts.
    pub fn land(&mut self, tip: &str, head: &str) -> Result<Option<String>> {
        let key = (tip.to_owned(), head.to_owned());
        if let Some(landed) = self.landings.get(&key) {
            return Ok(Some(landed.clone()));
        }
        let merge = self.merge(tip, head)?;
        if !merge.clean {
            return Ok(None);
        }
        // These commits never reach a ref and get garbage-collected, and signing each one would
        // fire a 1Password prompt per simulated step.
        let args =
            ["commit-tree", "--no-gpg-sign", "-p", tip, "-p", head, "-m", "coord merge-plan simulation", &merge.tree];
        let landed = self.git.run_with_env(&args, &SIMULATION_ENV)?;
        self.landings.insert(key, landed.clone());
        Ok(Some(landed))
    }
}

//! Turning `HEAD` arguments into commits.

use std::path::Path;

use anyhow::{Context, Result};
use serde::Serialize;

use crate::git::Git;

/// One branch to land.
#[derive(Debug, Clone, Serialize)]
pub struct Head {
    pub label: String,
    /// The argument as given.
    #[serde(rename = "ref")]
    pub reference: String,
    pub sha: String,
    /// The commit is a snapshot of a worktree's uncommitted changes.
    pub dirty: bool,
}

/// Resolves `arg`: a worktree directory, `label=ref`, or a plain ref.
pub fn resolve(repo: &Git, arg: &str) -> Result<Head> {
    if Path::new(arg).is_dir() {
        return worktree(repo, arg);
    }
    let (label, rev) = match arg.split_once('=') {
        Some((label, rev)) if !label.is_empty() => (label, rev),
        _ => (arg, arg),
    };
    Ok(Head { label: label.to_owned(), reference: rev.to_owned(), sha: repo.commit_id(rev)?, dirty: false })
}

/// A worktree's uncommitted state as a commit, without stashing anything: `stash create`
/// writes the commit but no ref. Untracked files aren't part of it.
fn worktree(repo: &Git, dir: &str) -> Result<Head> {
    let worktree = Git::new(dir);
    let snapshot = worktree.run(&["stash", "create"]).with_context(|| format!("couldn't snapshot {dir}"))?;
    let dirty = !snapshot.is_empty();
    let rev = if dirty { snapshot } else { worktree.run(&["rev-parse", "HEAD"])? };
    Ok(Head {
        label: worktree.run(&["rev-parse", "--abbrev-ref", "HEAD"])?,
        reference: dir.to_owned(),
        // Resolving in the repo checks the worktree belongs to it.
        sha: repo.commit_id(&rev).with_context(|| format!("{dir} isn't a worktree of the repo"))?,
        dirty,
    })
}

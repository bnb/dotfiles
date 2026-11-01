//! The git state of the directory a session works in.

use std::path::{Path, PathBuf};

use anyhow::Result;

use crate::git::Git;

#[derive(Debug)]
pub struct RepoInfo {
    /// The worktree's top level.
    pub toplevel: PathBuf,
    /// The main checkout's dir name, so every worktree of a repo shows the same name.
    pub name: String,
    /// `None` before the first commit.
    pub branch: Option<String>,
    pub dirty: usize,
    pub unpushed: Option<usize>,
}

/// Inspects `dir`, or returns `None` when it's gone or not in a repo.
pub fn inspect(dir: &Path) -> Result<Option<RepoInfo>> {
    if !dir.is_dir() {
        return Ok(None);
    }
    let git = Git::new(dir);
    let Some(paths) = git.try_run(&["rev-parse", "--path-format=absolute", "--show-toplevel", "--git-common-dir"])?
    else {
        return Ok(None);
    };
    let mut paths = paths.lines().map(PathBuf::from);
    let toplevel = paths.next().unwrap_or_default();
    let common_dir = paths.next().unwrap_or_default();
    // Submodules and other layouts keep their git dir elsewhere; their own top level names them.
    let checkout = match common_dir.parent() {
        Some(parent) if common_dir.ends_with(".git") => parent,
        _ => &toplevel,
    };
    let name = checkout.file_name().unwrap_or(checkout.as_os_str()).to_string_lossy().into_owned();
    let branch = git.try_run(&["rev-parse", "--abbrev-ref", "HEAD"])?;
    let dirty = git.try_run(&["status", "--porcelain"])?.map_or(0, |status| status.lines().count());
    let unpushed = git
        .try_run(&["rev-list", "--count", "HEAD", "--not", "--remotes"])?
        .and_then(|count| count.trim().parse().ok());
    Ok(Some(RepoInfo { toplevel, name, branch, dirty, unpushed }))
}

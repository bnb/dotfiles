use std::path::PathBuf;

use anyhow::{Context, Result, ensure};
use clap::{Parser, Subcommand, ValueEnum};
use jiff::{SignedDuration, Span, SpanRelativeTo};
use serde::Serialize;

#[derive(Debug, Parser)]
#[command(name = "coord", version, about = "Census and merge planning for parallel Claude Code sessions")]
pub struct Cli {
    #[command(subcommand)]
    pub command: Command,
}

#[derive(Debug, Subcommand)]
pub enum Command {
    /// List Claude Code sessions on this machine: who's running, where, and what they last did.
    Census(CensusArgs),
    /// Plan a merge order for parallel branches without touching any ref, index, or worktree.
    MergePlan(MergePlanArgs),
}

#[derive(Debug, clap::Args)]
pub struct CensusArgs {
    /// Claude Code's config dir [default: ~/.claude].
    #[arg(long)]
    pub claude_dir: Option<PathBuf>,
    /// Where transcripts live; repeatable [default: <claude-dir>/projects].
    #[arg(long = "projects-dir")]
    pub projects_dirs: Vec<PathBuf>,
    /// Also list stopped sessions active within this long, like "90m", "24h", "3d".
    #[arg(long, default_value = "24h", value_parser = parse_since)]
    pub since: SignedDuration,
    /// Drop sessions whose cwd or worktree is under this path; repeatable.
    #[arg(long)]
    pub exclude: Vec<PathBuf>,
    /// Print a JSON array with every field untruncated.
    #[arg(long)]
    pub json: bool,
}

#[derive(Debug, clap::Args)]
pub struct MergePlanArgs {
    /// The repository the heads belong to.
    #[arg(long, default_value = ".")]
    pub repo: PathBuf,
    /// What the heads land on [default: origin/HEAD if it resolves, else origin/main].
    #[arg(long)]
    pub base: Option<String>,
    /// `auto` lands the least conflicting clean heads first; `given` keeps the input order.
    #[arg(long, value_enum, default_value_t = Order::Auto)]
    pub order: Order,
    /// Print the plan as JSON.
    #[arg(long)]
    pub json: bool,
    /// Each one a ref, `label=ref` (like `#123=origin/fix`), or a worktree directory.
    #[arg(required = true)]
    pub heads: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, ValueEnum, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Order {
    Auto,
    Given,
}

/// Parses a friendly duration like "90m" or "3d", counting a day as 24 hours.
pub fn parse_since(text: &str) -> Result<SignedDuration> {
    let span: Span = text.parse().with_context(|| format!("not a duration: {text:?}"))?;
    let duration = span.to_duration(SpanRelativeTo::days_are_24_hours())?;
    ensure!(!duration.is_negative(), "--since can't be negative: {text:?}");
    Ok(duration)
}

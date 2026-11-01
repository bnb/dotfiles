//! A coordinator's view of parallel Claude Code work: who's running where (`census`) and the
//! order their branches can land in (`merge-plan`).

use std::io::Write;

use anyhow::Result;

pub mod census;
pub mod cli;
mod git;
pub mod merge_plan;
pub mod text;

/// Runs one parsed command, writing its report to `out`.
pub fn run(cli: cli::Cli, out: &mut dyn Write) -> Result<()> {
    match cli.command {
        cli::Command::Census(args) => census::run(args, out),
        cli::Command::MergePlan(args) => merge_plan::run(args, out),
    }
}

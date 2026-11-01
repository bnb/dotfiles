//! `coord merge-plan`: which parallel branches conflict, and an order to land them in.

mod heads;
pub mod order;
mod render;
mod simulate;

use std::io::Write;

use anyhow::{Context, Result};
use indexmap::IndexMap;
use rustc_hash::FxBuildHasher;
use serde::Serialize;

use crate::cli::{MergePlanArgs, Order};
use crate::git::Git;
use heads::Head;
use simulate::Simulator;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Plan {
    pub base: Base,
    pub heads: Vec<HeadReport>,
    /// How many pairs of heads there are, conflicting or not.
    pub pair_count: usize,
    /// Only the pairs that conflict.
    pub pairs: Vec<PairConflict>,
    pub hot_files: Vec<HotFile>,
    pub order: Order,
    pub chain: Vec<Step>,
}

#[derive(Debug, Serialize)]
pub struct Base {
    #[serde(rename = "ref")]
    pub reference: String,
    pub sha: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HeadReport {
    #[serde(flatten)]
    pub head: Head,
    pub vs_base: Outcome,
}

#[derive(Debug, Serialize)]
pub struct Outcome {
    pub clean: bool,
    pub conflicts: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct PairConflict {
    pub a: String,
    pub b: String,
    pub files: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct HotFile {
    pub path: String,
    pub pairs: usize,
}

/// One head's turn in the simulated chain.
#[derive(Debug, Serialize)]
pub struct Step {
    pub label: String,
    pub landed: bool,
    /// The last head that landed before this one, for a head that conflicts.
    pub after: Option<String>,
    pub conflicts: Vec<String>,
}

pub fn run(args: MergePlanArgs, out: &mut dyn Write) -> Result<()> {
    let git = Git::new(&args.repo);
    let plan = plan(&git, args.base.as_deref(), args.order, &args.heads)?;
    if args.json {
        serde_json::to_writer_pretty(&mut *out, &plan)?;
        writeln!(out)?;
        return Ok(());
    }
    out.write_all(render::plan(&plan).as_bytes())?;
    Ok(())
}

fn plan(git: &Git, base: Option<&str>, order: Order, args: &[String]) -> Result<Plan> {
    let base_ref = match base {
        Some(base) => base.to_owned(),
        None => default_base(git)?,
    };
    let base = Base { sha: git.commit_id(&base_ref)?, reference: base_ref };
    let heads = args.iter().map(|arg| heads::resolve(git, arg)).collect::<Result<Vec<_>>>()?;
    let mut sim = Simulator::new(git);

    let mut reports = Vec::new();
    for head in &heads {
        let merge = sim.merge(&base.sha, &head.sha)?;
        reports.push(HeadReport {
            head: head.clone(),
            vs_base: Outcome { clean: merge.clean, conflicts: merge.conflicts },
        });
    }

    let mut conflicts = vec![vec![false; heads.len()]; heads.len()];
    let mut pairs = Vec::new();
    let mut hot: IndexMap<String, usize, FxBuildHasher> = IndexMap::default();
    for a in 0..heads.len() {
        for b in a + 1..heads.len() {
            let merge = sim.merge(&heads[a].sha, &heads[b].sha)?;
            if merge.clean {
                continue;
            }
            conflicts[a][b] = true;
            conflicts[b][a] = true;
            for path in &merge.conflicts {
                *hot.entry(path.clone()).or_default() += 1;
            }
            pairs.push(PairConflict { a: heads[a].label.clone(), b: heads[b].label.clone(), files: merge.conflicts });
        }
    }
    hot.sort_by(|_, a, _, b| b.cmp(a));

    let sequence = match order {
        Order::Given => (0..heads.len()).collect(),
        Order::Auto => order::auto(&conflicts, |landed, head| -> Result<bool> {
            let tip = tip_after(&mut sim, &base.sha, &heads, landed)?;
            Ok(sim.merge(&tip, &heads[head].sha)?.clean)
        })?,
    };

    Ok(Plan {
        chain: chain(&mut sim, &base.sha, &heads, &sequence)?,
        base,
        heads: reports,
        pair_count: heads.len() * heads.len().saturating_sub(1) / 2,
        pairs,
        hot_files: hot.into_iter().map(|(path, pairs)| HotFile { path, pairs }).collect(),
        order,
    })
}

/// `origin/HEAD` names the remote's default branch when the clone recorded it.
fn default_base(git: &Git) -> Result<String> {
    let has_origin_head = git.try_run(&["rev-parse", "--verify", "--quiet", "origin/HEAD^{commit}"])?.is_some();
    Ok(if has_origin_head { "origin/HEAD" } else { "origin/main" }.to_owned())
}

/// The tip once `landed`, each already checked to merge cleanly, merged onto `base` in order.
fn tip_after(sim: &mut Simulator, base: &str, heads: &[Head], landed: &[usize]) -> Result<String> {
    let mut tip = base.to_owned();
    for &head in landed {
        tip = sim.land(&tip, &heads[head].sha)?.context("a landed head stopped merging cleanly")?;
    }
    Ok(tip)
}

/// Lands heads in `sequence`, skipping each one that conflicts with the tip so far.
fn chain(sim: &mut Simulator, base: &str, heads: &[Head], sequence: &[usize]) -> Result<Vec<Step>> {
    let mut tip = base.to_owned();
    let mut previous: Option<&str> = None;
    let mut steps = Vec::new();
    for &index in sequence {
        let head = &heads[index];
        if let Some(next) = sim.land(&tip, &head.sha)? {
            tip = next;
            previous = Some(&head.label);
            steps.push(Step { label: head.label.clone(), landed: true, after: None, conflicts: Vec::new() });
            continue;
        }
        steps.push(Step {
            label: head.label.clone(),
            landed: false,
            after: previous.map(str::to_owned),
            conflicts: sim.merge(&tip, &head.sha)?.conflicts,
        });
    }
    Ok(steps)
}

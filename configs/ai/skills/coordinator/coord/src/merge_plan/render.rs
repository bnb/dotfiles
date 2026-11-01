//! The plan as text.

use super::Plan;
use crate::cli::Order;
use crate::text::columns;

pub fn plan(plan: &Plan) -> String {
    let mut out = format!("base {} {}\n\nheads\n", plan.base.reference, short(&plan.base.sha));
    let rows: Vec<Vec<String>> = plan
        .heads
        .iter()
        .map(|report| {
            let head = &report.head;
            let vs_base = if report.vs_base.clean {
                "clean".to_owned()
            } else {
                format!("conflicts: {}", report.vs_base.conflicts.join(", "))
            };
            let dirty = if head.dirty { " (dirty)" } else { "" };
            vec![format!("  {}", head.label), head.reference.clone(), format!("{}{dirty}", short(&head.sha)), vs_base]
        })
        .collect();
    out.push_str(&columns(&rows));

    out.push_str(&format!("\npairs that conflict ({} of {})\n", plan.pairs.len(), plan.pair_count));
    for pair in &plan.pairs {
        out.push_str(&format!("  {} x {}: {}\n", pair.a, pair.b, pair.files.join(", ")));
    }

    out.push_str("\nhot files\n");
    if plan.hot_files.is_empty() {
        out.push_str("  none\n");
    }
    for file in &plan.hot_files {
        let noun = if file.pairs == 1 { "pair" } else { "pairs" };
        out.push_str(&format!("  {} ({} {noun})\n", file.path, file.pairs));
    }

    let order = match plan.order {
        Order::Auto => "auto",
        Order::Given => "given",
    };
    out.push_str(&format!("\nchain ({order} order)\n"));
    for (index, step) in plan.chain.iter().enumerate() {
        let number = index + 1;
        if step.landed {
            out.push_str(&format!("  {number}. {} lands clean\n", step.label));
            continue;
        }
        let after = step.after.as_ref().map(|after| format!(" after {after}")).unwrap_or_default();
        out.push_str(&format!(
            "  {number}. {} needs main merged in{after}: {}\n",
            step.label,
            step.conflicts.join(", ")
        ));
    }
    out
}

fn short(sha: &str) -> &str {
    sha.get(..7).unwrap_or(sha)
}

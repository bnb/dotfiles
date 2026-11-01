//! Choosing a landing order, kept free of git so it can be property-tested.

/// Greedy landing order over heads `0..conflicts.len()`.
///
/// Each step lands, among the heads that merge cleanly onto the tip so far, the one that
/// conflicts with the fewest other remaining heads, so it blocks the fewest. Ties go to input
/// order, which carries the user's priority. Heads that conflict with the tip follow in input
/// order. `clean_onto_tip(landed, head)` answers for the tip after `landed` merged in order.
pub fn auto<E>(
    conflicts: &[Vec<bool>],
    mut clean_onto_tip: impl FnMut(&[usize], usize) -> Result<bool, E>,
) -> Result<Vec<usize>, E> {
    let mut remaining: Vec<usize> = (0..conflicts.len()).collect();
    let mut landed = Vec::new();
    loop {
        let mut best: Option<(usize, usize)> = None;
        for &head in &remaining {
            if !clean_onto_tip(&landed, head)? {
                continue;
            }
            let blocked = remaining.iter().filter(|&&other| other != head && conflicts[head][other]).count();
            if best.is_none_or(|(_, fewest)| blocked < fewest) {
                best = Some((head, blocked));
            }
        }
        let Some((head, _)) = best else {
            break;
        };
        landed.push(head);
        remaining.retain(|&other| other != head);
    }
    landed.extend(remaining);
    Ok(landed)
}

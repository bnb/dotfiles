# landing

many sessions have PRs open against the same repo and I want them merged in the order with the least churn. read the forge's notes first: [github.md](github.md) or [tangled.md](tangled.md).

## who does what

- you're the only merger. tell every owner, in the first message: "Tierney asked me to set the merge order and do all merges, so please don't merge yourself."
- owners fix their own CI failures and review comments (the pr-feedback skill), one batched push per round, and tell you `ready #N <sha>`. anything only I can decide comes to you, not to me.
- merge each PR as soon as it's mergeable. don't report it as "ready" and wait for me.
- release, publish, and deploy PRs never fall under "merge everything". each one waits until I name it.
- do your own git work in your own worktree. never check out or detach HEAD in my main checkout.

## the order

1. read the target branch's rules before planning: required checks, up to date before merging, approvals dismissed on push, approval of the latest push, code owners, merge queue. two coordinators got this wrong and stalled merges.
2. run `coord merge-plan --repo <repo> --base origin/main '#12=origin/bnb/a' '#13=origin/bnb/b' <worktree>...`. heads can be refs, `label=ref`, or worktree paths, so unpushed work counts too.
3. adjust for what the tool can't see, in this priority:
   - fixes that unbreak main
   - CI speedups and flake fixes
   - stacks bottom-up
   - numbered migrations in sequence
   - shared budgets (bundle size, perf)
   - when it's otherwise balanced, PRs that merge cleanly and don't need slow CI reruns
4. a clean, approved PR merges now if everything it conflicts with needs a push anyway. the second lander resolves the conflict.
5. if most pairs conflict on the same hot files (a CHANGELOG, a registry, a TODO), land a refactor that takes those lines away first. one changelog-fragments PR once cut about 20 push rounds down to one per PR.
6. rerun the plan on every new approval and before every push you allow.

send each owner its position, what it conflicts with, and when to push. a staged push waits until every queued PR it conflicts with has landed, because a push re-runs CI and, under either approval rule, needs a fresh approval.

## after each landing

- confirm the merge commit is on main.
- tell the next owner. recheck owners' new heads against main, since a push built on an old base can bring back a fixed bug.
- watch main's CI. two PRs that each passed alone can still turn main red together.
- merge only after a run that actually ran the tests. a skipped or draft run doesn't count.

## CI capacity

- where runners are limited (as in cutenode/localnetwork), only the next PR to merge and the one after it need CI (pr-feedback's window). cancel runs on PRs whose head will change, from a protect list and a throwaway list the owners agreed to.
- release workflows and merge queue runs are report-only. never cancel them.
- give the CI slot to a PR that needs no push while another waits on 1Password.

## if I'm away

owners prepare against the final main and queue their pushes for one 1Password burst (one sitting where I approve every held action). see [away.md](away.md). when I'm back, tell every owner at once.

## reporting

- status: merged, approved and waiting on CI, being pushed, a waits-on table (PR, waiting on, owner), waiting on you, and next.
- the final report is a table of PR, merge commit, and what each one needed.

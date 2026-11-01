# tangled

the `tg` specifics behind [landing.md](landing.md). tangled PRs are patch rounds, not branches with approvals, so a lot of github.md has no equivalent. check `tg <command> --help` before assuming a GitHub feature exists.

- **state**: `tg pr list --json` and `tg pr view <n> --json`. `tg pipeline list` and `tg pipeline status` give CI state.
- **new round**: `tg pr update` submits the branch's current state as a new round. that's tangled's version of a push, so batch fixes into one round the same way.
- **CI**: `tg pipeline trigger <rev>` reruns CI without a push, and `tg pipeline cancel` frees capacity. the CI window rules in landing.md still apply.
- **merging**: `tg pr merge <n>`. there's no auto-merge, so merge once the pipeline for the current round passes.
- **planning**: `coord merge-plan` works on any git remote. fetch the PR heads (`tg pr checkout` or the patch's branch) and pass them as refs.

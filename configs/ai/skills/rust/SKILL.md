---
name: rust
description: My conventions for Rust code (cargo-nextest, clippy, rustc_hash, IndexMap, hegel property tests and a hegel-only coverage run) and how to keep target/ dirs from filling the disk. Use whenever you build, test, run coverage on, or change code in a Rust crate or workspace, even a one-line change, and whenever disk space runs low on a machine with Rust projects. Not for explaining Rust concepts or writing about Rust.
---

# Rust

- tests run with cargo-nextest, lints with clippy.
- hash maps use `rustc_hash`. prefer `IndexMap` over `BTreeMap`.
- property tests use hegel. hegel tests get their own coverage run (`-C instrument-coverage`) held to the same thresholds as the full suite.
- run one heavy job (coverage, mutation testing, benchmarks) at a time. they compete for CPU and each can write tens of GB.

## target/ dirs

every worktree builds its own `target/`, and they reach 10 to 100G. build artifacts are cheap to rebuild, so be aggressive:

- run `cargo clean` in any worktree you built in before you finish with it.
- before a build, check `df -h /`. under 100G free, `cargo clean` every project under `~/GitHub` whose `target/` hasn't been built in 3 days, and say how much that freed.

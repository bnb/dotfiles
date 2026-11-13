---
name: new-project
description: My default stack for starting a new project or app (SvelteKit, Vitest, Playwright, Storybook, oxlint, evlog, fnm, Electron Forge, ratatui), its dev, check, and deploy scripts, and where growing lists live. Use when scaffolding a project, choosing its tools, adding a project-level script, or adding a list that grows (providers, sites, checks).
---

# new projects

unless the project says otherwise: Node.js pinned in `.node-version` for fnm, TypeScript, SvelteKit with Svelte 5, shadcn-svelte, Vite, Vitest with `@vitest/coverage-v8`, Playwright, Storybook, Lighthouse, oxlint and oxfmt, and evlog for logs. Electron apps use Electron Forge. Rust TUIs use ratatui.

- every project has one script each for dev (everything running), check, and deploy or publish, listed in the README. anything I'd paste into a dashboard more than once becomes an idempotent script that skips unchanged items.
- growing lists (providers, sites, checks) live in a checked-in JSON file with a JSON Schema. if users might change them, expose them in settings with import and export.

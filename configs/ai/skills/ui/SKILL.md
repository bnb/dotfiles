---
name: ui
description: My rules for building and checking user interfaces (web apps, Electron, native, browser extensions): matching the app's design language, widths to check, no flashes or layout shift, never blocking on data, loading, empty and error states with Storybook stories, session handling, and the accessibility and Lighthouse checks that count as done. Use whenever you build, change, fix, or review screens, components, styles, or layout, including a small visual bug, design variants, and app harnesses that click through every screen. Not for backend endpoints, CLI commands, or writing PRs and docs.
---

# UI and design

- polished and cohesive, in the app's existing design language. new things look native, never hacked in, and match neighboring elements' size and height exactly.
- check UI at phone, narrow-panel, and wide widths and while scrolling, in dev and a production build, and show me before and after screenshots.
- no flashes, jumps, or jitter. load saved preferences (theme, settings, auth state) before first paint, and keep layout stable as loaders come and go.
- never block a page on data. render static parts immediately, ghost only dynamic data, and show each result (counts included) as it resolves. startup should feel instant, about 200ms.
- design every state (loading, empty, error), each with a Storybook story, mobile too. errors look like an expected part of the app and offer the next step.
- returning users: catch an expired session on load, not on the first click. when navigating between items, never show the previous one's data.
- when a background check fails, fall back to a sane state (signed out, partial data), not a blocking notice. users never see internal state or diagnostics, and copy never mentions implementation details.
- design options means several genuinely different variants I can open and compare.
- accessibility and Lighthouse checks are part of done. the chrome-devtools `a11y-debugging` skill and its `lighthouse_audit` tool cover both.

## app harness

every app (native, Electron, browser extension) gets a harness that drives every surface, preferring purpose-fit existing tools (Playwright, including its Electron support, before anything homemade). use it, with subagents per feature, to find what's broken.

---
name: atproto
description: My conventions for AT Protocol apps (lexicons, at:// URIs, HappyView AppViews, Atmosphere account sign-in, at-tags, standard.site). Use when working on anything built on the AT Protocol or Bluesky.
---

# AT Protocol

- prefer `at://` URIs over https links when a record exists.
- before inventing a lexicon, check [lexicon.garden](https://lexicon.garden) for an existing one and for conventions. use `knownValues`, not a closed `enum`, for strings that will grow.
- be client-neutral: don't hardcode Bluesky, and let people choose which app opens posts.
- a project's AT Protocol identity is its domain.
- in UI, the account people sign in with is an "Atmosphere account".
- keep data in the user's PDS and on the client where possible. with HappyView as the AppView, data collection lives there (lexicons and Lua), not in app scripts, and every read goes through it, never straight to a PDS or the Bluesky AppView. never backfill a whole collection.
- support [at-tags](https://tangled.org/chrisshank.com/at-tags/) and standard.site metadata where they apply.

---
title: Release 1.1.0 beta relabel
type: release-record
status: active
parent: "[[docs/work/v1-stable/index|v1-stable]]"
created: 2026-05-25T12:43:53
updated: 2026-05-25T12:43:53
tags:
  - agent/work
  - initiative/v1-stable
  - release
created_by: codex
updated_by: codex
---

# Release 1.1.0 Beta Relabel

## Reason

The user requested changing the current `1.1.0` release line to a beta because
the current release contains regressions in functionality and UI/UX relative to
the stable `1.0.0` user experience. The release should not be presented as a
stable end-user release until those regressions are repaired.

## Product Metadata Change

- `package.json` version changed from `1.1.0` to `1.1.0-beta.1`.
- `manifest.json` version changed from `1.1.0` to `1.1.0-beta.1`.
- `versions.json` replaced the stable `1.1.0` entry with
  `1.1.0-beta.1`, preserving the `1.12.0` minimum Obsidian app version.

The project already uses prerelease identifiers in `versions.json`
(`1.0.0-beta.N` and `1.0.0-rc.2`), so `1.1.0-beta.1` follows existing local
versioning convention.

## Scope Boundary

No tag, GitHub Release, push, merge, or history rewrite was performed. The
existing local tag `1.1.0` still exists and remote release state must be handled
explicitly before any public release correction.

## Verification

- `node -e` JSON parse gate passed for `package.json`, `manifest.json`, and
  `versions.json`.
- `git diff --check -- package.json manifest.json versions.json` exited 0 with
  only repository line-ending warnings.
- Targeted search found no remaining product metadata reference to stable
  `"1.1.0"` in `package.json`, `manifest.json`, or `versions.json`.
- `pnpm run build:plugin` exited 0.

## Follow-Up Before Publishing

- Decide whether the already-published `1.1.0` GitHub Release should be marked
  as a prerelease, deleted/recreated under a beta tag, or superseded by a new
  beta release.
- Do not push, retag, delete a tag, or edit GitHub Release state without an
  explicit release-management instruction.

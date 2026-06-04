---
title: 0006 — Publish channel split (beta/stable)
type: adr
status: active
parent: "[[docs/architecture/adr/README|adr]]"
created: 2026-05-26T00:00:00
updated: 2026-05-28T21:24:03
created_by: claude-opus-4-7
updated_by: codex-gpt-5
tags:
  - agent/adr
  - release/discipline
---

# 0006 — Publish channel split (beta/stable)

**Decision status:** Superseded as active publish guidance by
[[docs/work/hardening/research/2026-05-27-version-streams-distillation/index|version-streams]]
on 2026-05-27/28. **Original date:** 2026-05-26.

## Supersession note

The original two-channel split protected stable users, but its branch mapping is no longer the active
discipline. The authoritative stream topology is now:

- `main` = stable.
- `dev` = beta/nightly.
- `sandbox` = canary.

Retain this ADR as the historical predecessor for "stable users are protected from experimental
builds." Use `version-streams` and the `publish` initiative for current branch/channel mechanics.

## Context

Release `1.1.0` shipped regressions (including a mobile break) plus dependabot/security
warnings to stable users who tapped update. `sandbox` (~180 commits) never ran CI.

## Original decision

Two channels: **`sandbox` = beta** (may break; distributed via BRAT + a GitHub
prerelease whose `manifest.json` does **not** bump `main`'s `minAppVersion`, so stable
users do not auto-update) and **`main` = stable** (patches/fixes/refactor). Betas are
CI-gated; `-beta` tags are marked prerelease. The `publish` initiative
([[docs/work/publish/index|publish]]) owns the mechanics, including the 1.1.0→beta
relabel and the mobile regression.

## Consequences

- Stable users are protected; betas are testable via BRAT; promotion is documented.
- Requires adding `sandbox` (or a `beta` branch) to CI triggers.

## Alternatives considered

- Single channel (current): ships breakage to everyone.
- `manifest-beta.json`: deprecated; BRAT now reads the release `manifest.json`.

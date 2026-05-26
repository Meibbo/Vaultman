---
title: 0006 — Publish channel split (beta/stable)
type: adr
status: active
parent: "[[docs/architecture/adr/README|adr]]"
created: 2026-05-26T00:00:00
updated: 2026-05-26T00:00:00
created_by: claude-opus-4-7
updated_by: claude-opus-4-7
tags:
  - agent/adr
  - release/discipline
---

# 0006 — Publish channel split (beta/stable)

**Decision status:** Accepted. **Date:** 2026-05-26.

## Context

Release `1.1.0` shipped regressions (including a mobile break) plus dependabot/security
warnings to stable users who tapped update. `sandbox` (~180 commits) never ran CI.

## Decision

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

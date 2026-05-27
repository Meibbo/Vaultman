---
title: Publish — stable/main reconciliation + beta channel + release safety
type: initiative-index
status: active
parent: "[[docs/work/roadmap-overview|Roadmap Overview]]"
created: 2026-05-26T00:00:00
updated: 2026-05-27T12:55:00-05:00
tags:
  - agent/initiative
  - initiative/publish
  - release/discipline
  - release/beta-channel
created_by: claude-opus-4-7
updated_by: claude-opus-4-7
---

# Publish

Standalone initiative for safe shipping. Split out of the Explorer brainstorm on
2026-05-26 because it is not hardening, polish, or pkm-ai work: it is about
protecting installed users while `main`/stable is reconciled and a beta channel
is established. It is intended to be planned and executed by a separate agent,
independent of the architecture brainstorm.

Context source:
[[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/index|Architecture Foundation Discovery]]
(streams 3 + 4: release/CI facts and Obsidian plugin distribution best practices).

## Why separate

- User-facing risk: release `1.1.0` regressed the experience (incl. mobile) and
  carried dependabot/security warnings. Shipping more breaking work on the stable
  channel is irresponsible until this is fixed.
- It is process/release work, decoupled from the architecture refactor; another
  agent can own it without the brainstorm context.

## Hard guards (carry into any plan)

- Do NOT push, retag, delete a tag, or edit GitHub Release state without an
  explicit release-management instruction from the user.
- `main` must stay zero-AI-files.
- `sandbox` = beta channel; `main` = stable (patches/fixes/refactor).

## Seeded backlog (verify each before acting)

Active design:

- [[docs/work/publish/specs/2026-05-26-release-1-0-1-from-1-0-0-design|Release 1.0.1 from 1.0.0 with beta workflow safety]]
- [[docs/work/publish/plans/2026-05-26-release-1-0-1-from-1-0-0/index|Release 1.0.1 from 1.0.0 implementation plan]]
- [[docs/work/publish/items/2026-05-26-release-1-0-1-candidate-verification|Release 1.0.1 candidate verification]]

1. **1.1.0 → beta relabel.** GitHub Release `1.1.0` is now named
   `1.1.0-beta.1` and marked prerelease. Its Git tag remains `1.1.0`; decide
   tag strategy before any future stable `1.1.0` plan.
   Source: [[docs/work/v1-stable/items/2026-05-25-release-1-1-0-beta-relabel|1.1.0 beta relabel]].
2. **Mobile regression.** No `Platform`/`isMobile` checks exist in `src/` and
   `isDesktopOnly:false` still claims mobile support. Document the exact mobile
   break; decide `isDesktopOnly` vs a platform-gated fix (ties to `serviceUnload`
   + `Platform` API).
3. **CI for the beta channel.** `sandbox` is not in `ci.yml` triggers (its commits
   never ran CI). Add `sandbox` (or a `beta` branch) to triggers so betas gate
   before publish.
4. **Beta distribution.** `manifest-beta.json` is deprecated; BRAT reads
   `manifest.json` from releases. Define the beta-publish flow that does NOT bump
   `main`'s manifest `minAppVersion` (so stable-store users do not auto-update).
   Mark `-beta` tags as prerelease in `release.yml`.
5. **Root-doc divergence (main vs sandbox).** License, CI/CD workflows, OpenSSF
   (incomplete), CHANGELOG differ between branches. Inventory and reconcile.
6. **Security.** Resolve dependabot/OpenSSF findings on the default branch;
   keep `pnpm run security:audit` green at high+.
7. **Beta → stable promotion.** Document the promotion process (when to retag,
   when to update `versions.json`/`minAppVersion`, release notes from CHANGELOG).

## Relationship to the umbrella

Absorbs the user-facing/release half of **R.D (Release Discipline)** from the
[[docs/work/hardening/specs/2026-05-19-explorer-merge-umbrella/index|Explorer Merge Umbrella]].
The umbrella keeps per-feature SemVer rationale; this initiative owns the channel
mechanics and the stable-user safety net.

## Next action

Release `1.0.1` is published:
<https://github.com/Meibbo/Vaultman/releases/tag/1.0.1>.

- Tag `1.0.1` points to
  `8fac770481220ca7c43ff78a70d897a62dc136ec`.
- Release workflow run `26526886518` passed and published `main.js`,
  `manifest.json`, and `styles.css`.
- Artifact attestations verified for all three assets.
- `origin/main` has no AI workflow files.
- GitHub Release `1.0.1` is titled `1.0.1`.
- GitHub Release `1.1.0` is titled `1.1.0-beta.1` and marked prerelease.

Await explicit user approval before cleaning up temporary release branches or
making any tag-level changes to `1.1.0`.

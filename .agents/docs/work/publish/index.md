---
title: Publish — stable/main reconciliation + beta channel + release safety
type: initiative-index
status: active
parent: "[[docs/work/roadmap-overview|Roadmap Overview]]"
created: 2026-05-26T00:00:00
updated: 2026-06-04T05:11:57
tags:
  - agent/initiative
  - initiative/publish
  - release/discipline
  - release/beta-channel
created_by: claude-opus-4-7
updated_by: codex-gpt-5
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
- **Current stream authority**:
  [[docs/work/hardening/research/2026-05-27-version-streams-distillation/index|version-streams]].
  `main` = stable, `dev` = beta/nightly, `sandbox` = canary. Older "`sandbox` = beta" text is
  superseded by the 2026-05-28 dev clarification and ADR 0006 reconciliation.

## Seeded backlog (verify each before acting)

Active design:

- [[docs/work/publish/specs/2026-05-26-release-1-0-1-from-1-0-0-design|Release 1.0.1 from 1.0.0 with beta workflow safety]]
- [[docs/work/publish/specs/2026-06-04-release-1-0-2-gate-normalization-design|Release 1.0.2 gate normalization design]]
- [[docs/work/publish/specs/2026-06-04-release-1-0-2-core-parity-hotfix-design|Release 1.0.2 core parity hotfix design]]
- [[docs/work/publish/plans/2026-05-26-release-1-0-1-from-1-0-0/index|Release 1.0.1 from 1.0.0 implementation plan]]
- [[docs/work/publish/plans/2026-06-04-release-1-0-2-gate-normalization/index|Release 1.0.2 gate normalization implementation plan]]
- [[docs/work/publish/plans/2026-06-04-release-1-0-2-core-parity-hotfix/index|Release 1.0.2 core parity hotfix implementation plan]]
- [[docs/work/publish/items/2026-05-26-release-1-0-1-candidate-verification|Release 1.0.1 candidate verification]]
- [[docs/work/publish/items/2026-06-04-release-1-0-2-gate-escape-triage|Release 1.0.2 gate escape triage]]
- [[docs/work/publish/items/2026-06-04-release-1-0-2-gate-delta-inventory|Release 1.0.2 gate delta inventory]]
- [[docs/work/publish/items/2026-06-04-release-1-0-2-parallel-dispatch|Release 1.0.2 parallel dispatch plan]]
- [[docs/work/publish/items/2026-06-04-release-1-0-2-inline-execution-verification|Release 1.0.2 inline execution verification]]
- [[docs/work/publish/research/2026-06-04-stylelint-obsidian-css-gate|Stylelint research for Obsidian CSS gate]]

1. **1.1.0 → beta relabel.** GitHub Release `1.1.0` is now named
   `1.1.0-beta.1` and marked prerelease. Its Git tag remains `1.1.0`; decide
   tag strategy before any future stable `1.1.0` plan.
   Source: [[docs/work/v1-stable/items/2026-05-25-release-1-1-0-beta-relabel|1.1.0 beta relabel]].
2. **Mobile regression.** No `Platform`/`isMobile` checks exist in `src/` and
   `isDesktopOnly:false` still claims mobile support. Document the exact mobile
   break; decide `isDesktopOnly` vs a platform-gated fix (ties to `serviceUnload`
   + `Platform` API).
3. **CI for beta/canary streams.** `dev` (beta/nightly) and `sandbox` (canary)
   must both run green checks before prerelease distribution; older sandbox-only
   beta language is superseded.
4. **Beta/canary distribution.** `manifest-beta.json` is deprecated; BRAT reads
   `manifest.json` from releases. Define prerelease flows for `dev` and `sandbox`
   that do NOT bump `main`'s manifest `minAppVersion` (so stable-store users do
   not auto-update). Mark channel tags as prerelease in `release.yml`; exact
   pre-release labels remain open in `version-streams`.
5. **Root-doc divergence (main vs sandbox).** License, CI/CD workflows, OpenSSF
   (incomplete), CHANGELOG differ between branches. Inventory and reconcile.
6. **Security.** Resolve dependabot/OpenSSF findings on the default branch;
   keep `pnpm run security:audit` green at high+.
7. **Canary → beta → stable promotion.** Document upward-only promotion
   (`sandbox → dev → main`), when to retag, when to update
   `versions.json`/`minAppVersion`, and release notes from CHANGELOG.

> **2026-07-14:** los ítems 3/4/7 quedan operacionalizados en la policy nueva
> [[docs/architecture/policies/release|release]] (canales alpha/beta/stable + labels,
> runbook beta→stable, guardas de alphas, rollback/YANKED + caveat BRAT, clean-install
> + upgrade-path, lanes mobile emulada/real, CHANGELOG). Cierre definitivo al ejecutarse
> la primera beta `1.2.0-beta.1`
> ([[docs/work/polish/specs/2026-07-14-v1-2-floating-toc/index|spec v1.2]]).

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

Release `1.0.2` hotfix candidate is locally prepared but not pushed, merged,
tagged, or published. Source verification:
[[docs/work/publish/items/2026-06-04-release-1-0-2-inline-execution-verification|Release 1.0.2 inline execution verification]].

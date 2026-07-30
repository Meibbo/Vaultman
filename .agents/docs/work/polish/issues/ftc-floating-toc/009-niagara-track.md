---
title: FTC-009 — Niagara unified track, placement, and deferrals
type: issue
status: completed
parent: "[[docs/work/polish/issues/ftc-floating-toc/index|FTC index]]"
spec: "[[docs/work/polish/specs/2026-07-15-v1-2-beta1-floating-toc-fixes/03-ftc-009-niagara-track|FTC-009 spec]]"
created: 2026-07-15T00:00:00
created_by: codex-gpt-5
tags: [agent/issue, initiative/polish, niagara, floating-toc, release/1.2.0-beta.1]
---

# FTC-009 — Niagara unified track, placement, and deferrals

## Goal

Restore a coherent bell-shaped slide by letting action and group nodes share one geometry track when requested, while reducing beta.1 to supported appearance options.

## Scope

- Stable action entry order: Close · Toggle · Drill · Back.
- `floatingTocNiagaraNodes` truly joins available actions to the group track.
- Actions participate in geometry but never execute during scrub movement.
- Preserve proto-v12 Gaussian/tanh constants and add numeric fixtures.
- Replace positive monotonic HWM with signed bidirectional track shift.
- Center top/bottom and use correct horizontal transform origins.
- Plain style applies to action and indexed entries.
- Remove and force-off Name Pill, Scrub Glow, Name Cell, Name Reveal, Name Letters.
- Rename option copy to Join action nodes to slide.

## DoD — nonvisual

- [x] Pure entry-order/wave/shift tests cover all specified cases.
- [x] Component source contracts + pure target/suppression tests prove action scrub cannot invoke callbacks while a quick action tap remains available.
- [x] CSS/source tests prove centering, origins, and whole-track plain selectors.
- [x] Removed Settings rows cannot be re-enabled by old persisted values.
- [x] Svelte autofixer + focused tests + check/lint/stylelint/build pass.
- [x] Full unit suite passes before the whole corrective batch is declared closed.
- [x] Code-only commit; no `.agents`, push, tag, merge, or visual automation.

## Implementation

Landed code-only in `58193e14 fix(explorer): unify Niagara rail track`.

- TDD: missing pure module/action-map/clamp contracts were observed RED, then GREEN.
- Focused FTC-009 contracts: 3 files / 36 tests passed (also included in full unit).
- Integrated branch: 70 files / 345 unit tests passed.
- `pnpm run check`: 0 errors / 0 warnings; production bundle, ESLint, Stylelint, targeted Svelte formatting, and `git diff --check` passed.
- Global `format:check` remains red only for 18 pre-existing Svelte files outside this diff; both modified Svelte files pass targeted Prettier.

## Non-goals

Deleting deferred implementation code · device feel/performance verdict · new 2.0 ActionNode machinery.

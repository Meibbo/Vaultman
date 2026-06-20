---
title: P112 recovery ledger
created: 2026-06-19T01:25:00
created_by: codex-gpt-5
scope: local-scratch
---

# P112 Recovery Ledger

Local scratch ledger only. Do not treat `.agents/docs` as the current source of
truth until the PKM-AI docs recovery is complete.

## Baseline

- Product worktree:
  `C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\hotfix-1.0.2-css-scorecard`
- Working branch: `p112-type-view-loop-fix`
- Functional baseline confirmed by dev: `9b140ac fix(files): prevent sort bridge reactive loop`
- Current accepted commit: `c96bdf9 fix(tree): restore native caret geometry`
- Build synced to `plugin-dev`: yes, from `c96bdf9`
- Broad runtime regression fixed:
  `effect_update_depth_exceeded` from `2c2add3` sort-state bridge.

## Retained Functional Work

- `b92fd98 fix(scorecard): narrow file drag payloads`
- `5d59520 fix(filters): repair 1.1.2 scope labels and sorting`
- `e9af945 fix(content): respect filtered content scope`
- `2fcbbf0 fix(explorer): align visual hierarchy badges`
- `44b4bcf fix(search): stabilize highlight rendering`
- `ea54556 fix(context-menu): expose minimal existing actions`
- `66896dd feat(commands): focus existing search surfaces`
- `c95cefa feat(files): expose cached word count cell`
- `180d3d1 chore(release): prepare 1.1.2 beta`
- `e275098 fix(files): sort flat tree by file rows`
- `e0b8f57 fix(files): suppress default folder noise`
- `362ca3c fix(files): clarify prop count label`
- `a597e09 fix(statistics): keep stale word counts visible`
- `4c9b49c fix(commands): focus active explorer search`
- `2c2add3 fix(files): expose type view filter`
- `fecc020 test: normalize source guard line endings`
- `9b140ac fix(files): prevent sort bridge reactive loop`
- `a7a0694 fix(content): reconcile search within filtered scope`
- `0561ae7 fix(files): validate property rename patterns`
- `0f81051 fix(ui): default operation badges to monotone`
- `983a926 feat(settings): configure badge cancel click mode`
- `954d7c6 fix(search): stabilize explorer highlights`
- `c96bdf9 fix(tree): restore native caret geometry`

## Quarantined Commits From Local dev

These commits remain untrusted until each slice is reintroduced and verified on
top of `9b140ac`.

- None remaining from the originally quarantined local dev tail.

## Recovery Order

1. Done: Content Search scope parity:
   `a7a0694`, adapted from `3a8943a` + `861061f`.
2. Done: Rename pattern validation:
   `0561ae7`, adapted from `207e726`.
3. Done: Badge color setting:
   `0f81051`, adapted from `8750356`.
4. Done: Badge cancel interaction:
   `983a926`, adapted from `2502f90`.
5. Done: Search highlight stabilization:
   `954d7c6`, adapted from `bea07c7`.
6. Done: Caret/indent recovery:
   `c96bdf9`, adapted from `14ed3de`, `3b6ee54`, `196946b`, and `2955eeb`.
   Verified against `plugin-dev` DOM: Vaultman row keeps `tree-item-self`
   + `mod-collapsible`, caret uses `tree-item-icon collapse-icon is-collapsed`
   + `right-triangle`, and expanded state updates in place without rebuilding the
   row.

## Discipline

- No push.
- No `main`.
- No AI files in product worktree.
- No Obsidian CLI without `vault=plugin-dev`.
- For each slice: scout diff, add/verify focal RED where possible, apply minimum
  patch, run focal tests, then `lint`, `check`, `test:unit`, `build`, and
  `plugin-dev` reload/errors before accepting.

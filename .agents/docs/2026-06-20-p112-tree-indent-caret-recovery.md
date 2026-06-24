---
title: P112 tree indent and caret animation recovery
type: item
status: completed
lifecycle: active
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-06-20T00:00:00
updated: 2026-06-20T00:00:00
timestamp_note: "approximate date-only timestamp; local timestamp commands timed out during closeout"
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags:
  - vaultman/p112
  - vaultman/regression
  - vaultman/tree
---

# P112 tree indent and caret animation recovery

## Scope

Product worktree:
`C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\hotfix-1.0.2-css-scorecard`

Branch: `p112-type-view-loop-fix`.

This item records the closeout for the regression where Files tree parent rows at
depth `1+` rendered at the same visual indentation as root rows, despite the
nested guide line being positioned correctly. It also records the bounded
expand/collapse row motion added for virtual rows.

The original tracker path supplied earlier,
`docs/work/hardening/issues/post-1-1-2-stability-polish/index.md`, was not
present in the recovered `.agents` tree during this closeout. This note is kept
under `work/draft` until the recovered P112 tracker is restored or promoted.

## Root Cause Evidence

- DOM scout in `plugin-dev` showed the tree model was correct: rows such as
  `folder:stress-test-data/Projects` carried `--depth: 1`.
- The same rows computed `padding-inline-start: 24px`, equal to root rows.
- `obsidian dev:css` showed Obsidian's native `.tree-item-self.mod-collapsible`
  padding rule winning over Vaultman's lower-specificity `.vaultman-tree-row`
  padding rule.
- Core Files uses native row classes and caret markup, but its hierarchy is
  represented by nested relative DOM flow. Vaultman's `UnifiedTreeView` is a flat
  absolute-positioned virtual list, so it must translate depth to visual indent
  with a scoped flat-list rule.

## Implementation

- Added a scoped desktop rule for Vaultman frame/view tree virtual viewports:
  `.workspace-leaf-content[data-type="vaultman-frame"] .vaultman-tree-virtual-viewport .vaultman-tree-row.tree-item-self`
  and the matching `vaultman-view` selector.
- The rule restores tokenized depth padding without using `!important`, so it
  satisfies the Obsidian scorecard/stylelint `declaration-no-important` policy.
- Added a `UnifiedTreeView` structure-animation marker:
  `vaultman-tree-structure-animating` is applied only when `expandedIds` changes
  after the first render, then removed after `140ms`.
- Added temporary `top 100ms ease-in-out` transition for virtual rows only while
  the structure-animation class is present. Normal scrolling returns to the
  previous non-`top` transition state.
- Kept native caret markup:
  `tree-item-icon collapse-icon` with `right-triangle`, relying on Obsidian's
  `transform 100ms ease-in-out` SVG rule.

## Verification

Focused red/green:

- `corepack pnpm exec vitest run test/unit/virtualScrollCssSource.test.ts --config vitest.unit.config.mts`
  failed before the scoped indent rule existed, then passed after implementation.
- `corepack pnpm exec vitest run test/unit/viewTreeBehavior.test.ts --config vitest.unit.config.mts`
  failed before structure-animation state existed, then passed after implementation.

Focused regression suite:

- `corepack pnpm exec vitest run test/unit/coreCaretSource.test.ts test/unit/mobileCoreRowsSource.test.ts test/unit/viewTreeSource.test.ts test/unit/viewTreeBehavior.test.ts test/unit/virtualScrollCssSource.test.ts --config vitest.unit.config.mts`
  passed: 5 files, 19 tests.

Full gate run during closeout:

- `corepack pnpm run lint` passed.
- `corepack pnpm run check` passed with `svelte-check found 0 errors and 0 warnings`.
- `corepack pnpm run stylelint` passed.
- `corepack pnpm run test:unit` passed: 65 files, 254 tests.
- `corepack pnpm run build` passed and synced artifacts to
  `C:/Users/vic_A/Desktop/plugin-dev/.obsidian/plugins/vaultman`.

Obsidian CLI verification, always scoped to `vault=plugin-dev`:

- `obsidian vault=plugin-dev dev:errors clear`
- `obsidian vault=plugin-dev plugin:reload id=vaultman`
- `obsidian vault=plugin-dev command id=vaultman:open`
- DOM read after expanding `stress-test-data` confirmed:
  - root rows computed `padding-inline-start: 24px`;
  - depth `1` rows computed `padding-inline-start: 40px`;
  - caret SVG transition remained `transform 0.1s ease-in-out`;
  - rows had `top 0.1s ease-in-out` only while
    `vaultman-tree-structure-animating` was present;
  - after waiting, `vaultman-tree-structure-animating` was removed and row
    transition returned to background/box-shadow/color only.
- `obsidian vault=plugin-dev dev:errors` reported no captured errors.

## Follow-Up

- Promote or link this item into the restored P112 tracker if
  `post-1-1-2-stability-polish` is restored.
- If the user still perceives expand/collapse motion as different from Core
  Files, the next step is not another CSS tweak; it is a design decision about
  whether Vaultman should keep flat absolute virtualization or introduce a
  non-virtual native-flow tree mode for small scopes.

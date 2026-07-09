---
title: P112-025 Post QA regression recovery plan
type: issue
issue_id: P112-025
status: active
lifecycle: active
issue_kind: regression
parent: "[[docs/work/hardening/issues/post-1-1-2-stability-polish/index|Post 1.1.2 stability and polish local issues]]"
created: 2026-06-17T15:58:35
updated: 2026-06-17T16:56:18
labels:
  - active
  - patch-1.1.2
  - beta.1-blocker
  - regression-recovery
  - files
  - ui
  - statistics
tags:
  - agent/issue
  - initiative/hardening
  - release/1.1.2
  - explorer/files
  - ui
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# P112-025 Regression Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** recover the post-`1.1.2-beta.0` regressions without guessing, and choose current-`dev` repair or `1.1.1` reconstruction from evidence.

**Architecture:** freeze broad product edits until every reported breakage has a reproduction or a source-backed root cause. Treat `1.1.1` as the known-good baseline and current `dev` as suspect until each local closeout is revalidated with behavioral tests and plugin-dev smoke.

**Tech Stack:** Vaultman Svelte/TypeScript plugin, Obsidian core CSS/DOM reference from `obsidian-web-lab`, Vitest focused unit/component tests, Obsidian CLI only with explicit `vault=plugin-dev`.

---

## Problem

After the last internal `1.1.2` beta operations, user QA reports regressions in several areas that had been marked complete:

- Files tree caret is visually wrong or absent in screenshots.
- Official Obsidian expand/collapse animation is still absent.
- Level 2 nodes with caret render at level 1 content indent while the guide appears separately.
- Indent guide was pushed into an incoherent position.
- Tab menu no longer switches explorers reliably.
- Files nested on/off stopped working.
- Files sort stopped working.
- Active filters stopped showing file scope as `n/total`.
- Word count cell differs from Obsidian and blanks/stales after edits.
- Islands/modal behavior broke despite previously working.

The previous closeouts for P112-011 through P112-024 must be considered untrusted until revalidated. No further product fix should be accepted only because lint/check/unit/build pass.

## Verified Findings

### Official Core Files Reference

Source fixture: `test/fixtures/obsidian-web-lab/file-explorer-tree.html`.

Core DOM shape:

```html
<div class="tree-item nav-folder mod-root">
  <div class="tree-item-self nav-folder-title is-clickable mod-collapsible">
    <div class="tree-item-icon collapse-icon">
      <svg class="svg-icon right-triangle"></svg>
    </div>
    <div class="tree-item-inner nav-folder-title-content">Projects</div>
  </div>
  <div class="tree-item-children nav-folder-children">...</div>
</div>
```

Core CSS reference: `C:/Users/vic_A/Desktop/obsidian-web-lab/obsidian/app.css`.

- `.collapse-icon svg.svg-icon` sets the right-triangle dimensions and `transition: transform 100ms ease-in-out`.
- `.collapse-icon.is-collapsed svg.svg-icon` rotates the icon.
- `.tree-item-self.mod-collapsible { padding: var(--nav-item-parent-padding); }`.
- `.tree-item-self .tree-item-icon` absolutely positions the icon with `margin-inline-start: calc(-1 * var(--size-4-5))`.
- `.tree-item-children` owns the official child indentation guide with `padding-inline-start`, `margin-inline-start`, and `border-inline-start`.
- Relevant vars include `--nav-item-padding`, `--nav-item-parent-padding`, `--nav-item-children-padding-start`, `--nav-item-children-margin-start`, `--size-4-5: 20px`, and `--size-4-6: 24px`.

Implication: Vaultman cannot safely apply a subset of official tree classes to a virtual row unless it accounts for the entire official cascade. The previous hybrid row imported a high-specificity core padding rule without importing the official wrapper/children model.

### Product Root Causes Already Located

Product worktree: `C:/Users/vic_A/Desktop/vaultman/.claude/worktrees/hotfix-1.0.2-css-scorecard`, branch `dev`, local `dev...origin/dev [ahead 25]`, last observed clean.

Primary file for tree rendering: `src/components/layout/viewTree.ts`.

Current code facts:

- `rowSignature()` includes `opts.expandedIds.has(node.id) ? '1' : '0'`.
- `_renderRow()` calls `row.empty()` when the signature changes.
- `_renderRow()` resets `row.className = 'vaultman-tree-row'`, reapplies `coreCls`, and then `row.toggleClass('mod-collapsible', showCaret)`.
- The caret element is created as `vaultman-tree-toggle tree-item-icon collapse-icon` and gets `setIcon(toggleEl, 'right-triangle')`.
- `toggleEl.toggleClass('is-collapsed', !isExpanded)` is applied after the element is newly created.

Root cause hypothesis confirmed by source and Obsidian CSS:

- Indent regression: applying `mod-collapsible` to `.vaultman-tree-row.tree-item-self` lets core `.tree-item-self.mod-collapsible { padding: ... }` override Vaultman depth padding for caret rows. This matches the reported level-2 caret rows appearing at level-1 content indent while the guide still uses `--depth`.
- Missing animation: expanding/collapsing changes `rowSignature`, so the row is emptied and the SVG is recreated already in its final state. CSS transition cannot run if the element does not survive the state change.
- Geometry mismatch: official Files uses `.tree-item` wrapper, `.tree-item-self` row, and `.tree-item-children` container. Vaultman virtualized rows are not that DOM model.

### Word Count Parity

Core reference source: `C:/Users/vic_A/Desktop/obsidian-web-lab/obsidian/app.js`.

Extracted facts from the minified app:

- Core word-count plugin id is `word-count`.
- It creates a worker with a `pattern` regex and `countWords(str)` using `str.match(pattern)`.
- It strips frontmatter before CLI counting with a helper equivalent to `contentStart`.
- It debounces live editor counting with `requestWordCount=wc(this.countWords,200)`.

Current Vaultman file: `src/services/serviceStatisticsCache.ts`.

Current code uses:

```ts
const withoutFrontmatter = content.replace(/^---[\s\S]*?---\s*/, '');
const words = withoutFrontmatter.trim().match(/\S+/g);
return words?.length ?? 0;
```

Root cause hypothesis: Vaultman is not using the same tokenizer as core Obsidian, so parity cannot be guaranteed. Existing tests only assert simple whitespace examples and stale-cache behavior; they do not compare against Obsidian tokenization fixtures.

### Test Harness Gap

Current tests include many source-string guards:

- `test/unit/viewTreeSource.test.ts`
- `test/unit/explorerFilesSource.test.ts`
- `test/unit/pageFiltersSource.test.ts`
- `test/unit/searchFocusCommandsSource.test.ts`
- `test/unit/navbarFiltersSource.test.ts`

These can pass while runtime behavior is broken. Missing coverage:

- computed cascade check for Obsidian core CSS plus Vaultman row classes;
- DOM identity check that caret SVG survives expansion toggles;
- behavioral tab/menu switching test;
- behavioral nested on/off test;
- behavioral sort-order test after UI state mutation;
- scope counter test tied to active filters and content search together;
- word-count parity fixtures against the core regex and frontmatter removal.

### Obsidian CLI Safety

Because two vaults can be open, every Obsidian CLI command must use `vault=plugin-dev` as the first parameter. It is forbidden to use focused-vault fallback or touch `Start of The Road`.

If `obsidian-cli` DOM/live commands time out, the required fallback is `obsidian-web-lab`, not a guessed CSS patch.

## Repair vs Reconstruction Gate

Use current `dev` repair only if diagnostics show the regressions are localized to two or fewer boundaries:

- tree/caret/indent render path;
- files explorer state/sort/scope path;
- statistics word count path;
- filters island/modal overlay path.

Reconstruct from stable `1.1.1` if any of these are true:

- three independent boundaries fail before a small fix is landed;
- a fix for one boundary breaks another boundary;
- the tabmenu/nested/sort/scope controls are broken by intertwined state mutations rather than one localized commit;
- tests needed to prove current `dev` correctness exceed the patch risk of replaying safe commits from `1.1.1`.

Reconstruction approach: create a temporary comparison worktree from `1.1.1`, replay only verified safe commits, and stop at the first reproduced regression. Do not push, tag, merge, or touch `main`.

## Implementation Plan

### Task 1: Establish Reproduction Baselines

**Files:**

- Read: `src/components/layout/viewTree.ts`
- Read: `src/components/containers/explorerFiles.ts`
- Read: `src/components/layout/navbarTabs.svelte`
- Read: `src/components/layout/navbarFilters.svelte`
- Read: `src/components/pages/pageFilters.svelte`
- Read: `src/services/serviceStatisticsCache.ts`
- Read: `test/unit/*Source.test.ts`

- [ ] Record current `dev` status and commit range after stable `1.1.1`.
- [ ] Run focused tests that currently claim coverage for tree, files, filters, commands, native search, and statistics.
- [ ] Attempt Obsidian CLI smoke only with `obsidian vault=plugin-dev ...`.
- [ ] If CLI times out, document timeout and use `obsidian-web-lab` as the core reference.
- [ ] Capture screenshots or DOM output only from `plugin-dev`, never from `Start of The Road`.

### Task 2: Write Behavioral RED Tests Before Product Fixes

**Files:**

- Modify or add focused tests under `test/unit/`.
- Prefer behavior tests over source-string guards when the target logic is importable.

- [ ] Add a tree render test proving expansion toggles do not rebuild the caret SVG.
- [ ] Add a CSS cascade test proving caret rows preserve depth padding when core `.tree-item-self.mod-collapsible` exists.
- [ ] Add a files logic test proving nested-off mtime sort is global file order, not folder-first order.
- [ ] Add a files behavior test proving nested on/off changes rows and removes folder noise from result nodes.
- [ ] Add a filters/navigation behavior test proving tabmenu can switch explorers.
- [ ] Add a scope test proving active filters expose file scope as `n/total`.
- [ ] Add word-count parity fixtures for frontmatter, punctuation, decimal numbers, apostrophes, and unicode.

### Task 3: Repair Tree/Caret/Indent First

**Files:**

- Modify: `src/components/layout/viewTree.ts`
- Modify: `src/main.scss`
- Test: new/focused tree and CSS tests.

- [ ] Remove row-level use of `mod-collapsible` unless Vaultman adopts the official `.tree-item > .tree-item-self > .tree-item-children` model.
- [ ] Keep the official caret affordance on the caret child: `tree-item-icon collapse-icon` plus `right-triangle`.
- [ ] Remove expansion state from row signature or update collapsed classes in-place before returning.
- [ ] Verify the same caret element changes `is-collapsed` class and therefore can animate.
- [ ] Align indentation with one set of Vaultman depth variables; do not mix official child-container guide geometry with virtual row padding unless the DOM model matches.

### Task 4: Repair Files Controls and Scope

**Files:**

- Modify after diagnosis only: `src/components/containers/explorerFiles.ts`, `src/logic/logicsFiles.ts`, `src/logic/logicSort.ts`, `src/components/layout/navbarFilters.svelte`, `src/components/pages/pageFilters.svelte`.

- [ ] Reproduce tabmenu failure before editing.
- [ ] Reproduce nested on/off failure before editing.
- [ ] Reproduce sort failure before editing.
- [ ] Reproduce active file scope counter failure before editing.
- [ ] Patch only the first confirmed data-flow break, then rerun the focused behavior tests.

### Task 5: Repair Word Count Parity and Refresh

**Files:**

- Modify: `src/services/serviceStatisticsCache.ts`
- Potential add: `src/logic/logicWordCount.ts`
- Test: `test/unit/statisticsCacheService.test.ts` or a new word-count logic test.

- [ ] Extract a small tokenizer that matches Obsidian core word-count semantics closely enough for fixture parity.
- [ ] Keep frontmatter stripping explicit and tested.
- [ ] Ensure edit invalidation keeps last-known display only while refresh is pending, then updates without requiring page navigation.
- [ ] Avoid introducing a new persisted model in patch `1.1.2`.

### Task 6: Repair Islands/Modal Regression Last

**Files:**

- Inspect first: `src/components/layout/islandActiveFilters.ts`, `src/components/layout/islandQueue.ts`, `src/components/layout/PopupOverlay.svelte`, `src/components/layout/navbarPillFab.svelte`.

- [ ] Reproduce the modal/island break with a component or browser-like test.
- [ ] Check overlay stacking, pointer-events, active state, and cleanup paths.
- [ ] Patch only after confirming whether the break was caused by CSS, state cleanup, or tabmenu routing.

## Required Gates Before Any Closeout

- Focused RED/GREEN test for the exact regression fixed.
- `corepack pnpm run stylelint`
- `corepack pnpm run lint`
- `corepack pnpm run check`
- `corepack pnpm run test:unit`
- `corepack pnpm run build`
- Sync to `plugin-dev`.
- Obsidian CLI smoke with explicit `vault=plugin-dev`: reload, `dev:errors`, and DOM/CSS inspection when available.
- If CLI is unavailable, record the timeout and the `obsidian-web-lab` fallback evidence.

## Acceptance Criteria

- Files tabmenu switches explorers again.
- Files nested on/off changes the rendered result semantics.
- Files nested-off sort by most recent is global file order.
- Nested Files does not show folders as valid result nodes unless the mode explicitly needs a folder affordance.
- Level 2+ caret rows align with their actual depth and guide.
- Caret uses Obsidian `right-triangle` affordance and animates on expand/collapse.
- Active filters expose file scope as `n/total`.
- Content search respects active filters as user scope.
- Word count cell matches core-like fixtures and refreshes after edits without page navigation.
- No commands touch `Start of The Road`.

## Current Progress And Recommendation

- 2026-06-17T16:52:42: product commit `2955eeb fix(tree): preserve native caret state in place`.
- RED proved expand/collapse recreated the caret node and row-level `mod-collapsible` was on virtual rows.
- Fix kept `collapse-icon right-triangle` mutable in place via `applyMutableRowState()` and removed expansion state from row signature.
- Verification: focal tree suite 5 files/16 tests; stylelint; lint; check; unit 65 files/250 tests; build synced plugin-dev.
- Obsidian CLI smoke used `vault=plugin-dev`; reload returned `Reloaded: vaultman`, and `dev:errors` returned `No errors captured.`
- Next: Task 4 Files controls/scope reproduction: tabmenu, nested on/off, sort, and scope counter.
- Recommendation: continue current-`dev` repair only if Task 4 reproductions stay local; otherwise reconstruct from `1.1.1`.

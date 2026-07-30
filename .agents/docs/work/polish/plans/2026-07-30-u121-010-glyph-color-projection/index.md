---
title: Plan — U121-010 Files glyph color projection
type: plan
status: active
parent: "[[docs/work/polish/specs/2026-07-29-u121-010-glyph-color-projection/index|U121-010 spec]]"
created: 2026-07-30T00:00:00
updated: 2026-07-30T00:00:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags:
  - agent/plan
  - initiative/polish
  - release/1.2.1
  - explorer/files
  - glyph-color
---

# U121-010 Files Glyph Color Projection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve folder glyph color across Tree expansion, match the
ten-slot reference distribution, and project file glyph color to `cell_icon`
and visible `cell_name` in Tree, Table, and Cards only for `scope=files|both`.

**Architecture:** Add a pure Explorer-specific color resolver beside the
existing shared Floating Index palette, then pass its result through existing
Files renderer callbacks. Tree stores the resolved glyph on `labelColor` and
reuses the same precedence function during O(1) folder-icon refresh; Table and
Cards calculate from the global virtual projection index.

**Tech Stack:** TypeScript 5.8, Vitest 4, Obsidian DOM helpers, existing
virtual table/grid projections, pnpm 11.

---

## Operating context

- Product worktree: `C:/tmp/vaultman-release-beta2-final2`.
- Starting commit: `e6d12598`.
- Starting branch is the obsolete local name `codex/u121-013`; rename it to
  `codex/u121-010` before product edits.
- Release base: `origin/main` at `b30f8f23`, plus the already-authorized local
  README/GIF commit `e6d12598`.
- AI docs remain in `C:/Users/vic_A/Desktop/vaultman` on local `sandbox`; never
  push `.agents/`.
- No push, tag, merge, release, or PR is part of this plan.
- Do not touch Claude's disjoint U121-016/U121-017 Text explorer lane.

## File responsibility map

| Path | Responsibility in this patch |
|---|---|
| `src/logic/logicGlyphColor.ts` | Explorer-only ten-slot rainbow, scope resolution, and Iconic/glyph precedence |
| `src/components/containers/explorerFiles.ts` | Tree branch distribution, expansion refresh, Table/Cards callbacks |
| `src/components/layout/viewTree.ts` | Repaint recycled rows when `labelColor` changes |
| `src/components/layout/viewGrid.ts` | Table global-index callback and `cell_icon`/`cell_name` projection |
| `src/components/layout/viewFilesGrid.ts` | Cards global-index callback, signature, icon/name projection |
| `test/unit/glyphColor.test.ts` | Pure palette, scope, and precedence contract |
| `test/unit/explorerGlyphProjection.test.ts` | Real private Tree decoration and expansion regression |
| `test/unit/viewTreeBehavior.test.ts` | Real recycled-row repaint behavior |
| `test/unit/gridViewSource.test.ts` | Table wiring and active-link preservation guard |
| `test/unit/filesGridAnchorBehavior.test.ts` | Real Cards global-index and name precedence behavior |
| `test/unit/filesGridViewSource.test.ts` | Cards icon/signature wiring guard |

No settings, persistence types, CSS, Svelte components, virtualization
utilities, Floating Index product code, or generic U121-013 layer types change.

## Task and commit sequence

1. [[docs/work/polish/plans/2026-07-30-u121-010-glyph-color-projection/01-triage|GitHub triage]]
   - Task 1: correct and triage GitHub #46.
2. [[docs/work/polish/plans/2026-07-30-u121-010-glyph-color-projection/02-pure-contract|Pure contract]]
   - Task 2: pure Explorer palette/scope/precedence TDD.
   - Commit: `feat(explorer): add Files glyph projection contract`.
3. [[docs/work/polish/plans/2026-07-30-u121-010-glyph-color-projection/03-tree-projection|Tree projection]]
   - Task 3: Tree distribution and expansion-refresh TDD.
4. [[docs/work/polish/plans/2026-07-30-u121-010-glyph-color-projection/04-tree-row-repaint|Tree row repaint]]
   - Task 4: recycled Tree row name-color repaint TDD.
   - Commit: `fix(explorer): preserve Tree glyph colors`.
5. [[docs/work/polish/plans/2026-07-30-u121-010-glyph-color-projection/05-table|Table projection]]
   - Task 5: Table file projection TDD.
6. [[docs/work/polish/plans/2026-07-30-u121-010-glyph-color-projection/06-cards|Cards projection]]
   - Task 6: Cards file projection TDD.
   - Commit: `feat(explorer): project file glyph colors to geometry views`.
7. [[docs/work/polish/plans/2026-07-30-u121-010-glyph-color-projection/07-verification|Verification]]
   - Task 7: complete gates, adversarial audit, and final code-only commit
     inspection.

## Locked invariants

- The shared `rainbowGlyphColor(index, total)` remains byte-for-byte compatible
  for Floating Index consumers.
- Explorer rainbow is separate and maps positions
  `0→10, 1→1, …, 9→9, 10→10`.
- Root sibling position includes files and folders.
- Descendants inherit the top-level branch color.
- `cell_icon`: Iconic explicit color, then glyph color, then current default.
- `cell_name`: applicable glyph color wins visible color; otherwise the
  renderer's current behavior remains.
- Active/internal-link classes and active state are not renamed or removed.
- Table/Cards use `row.index` / `item.index`, never virtual-window offset.
- `scope=folders` does nothing in Table/Cards.
- Expansion stays O(1); no full `_render()` in `_refreshTreeExpansion()`.

## Execution rule

The user explicitly selected inline integration and waived plan approval.
Execute the shards in order with strict RED → GREEN → REFACTOR evidence. Do not
write production code for a task until its named test has failed for the
expected missing-behavior reason.

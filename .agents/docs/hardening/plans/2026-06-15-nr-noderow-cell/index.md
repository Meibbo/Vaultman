---
title: N.R — NodeRow cell primitive (tree pilot)
type: agent-plan
status: in-progress
parent: "[[docs/work/hardening/specs/2026-06-10-vaultman-2-0-synthesis-umbrella/index|Vaultman 2.0 Synthesis Umbrella]]"
created: 2026-06-15T00:00:00
updated: 2026-06-15T00:00:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/plan
  - initiative/hardening
  - umbrella-v2/wave-1
  - explorer/cells
  - style/headless
---

# N.R — NodeRow Cell Primitive (tree pilot)

Spine node **N.R** of the Vaultman 2.0 Synthesis Umbrella (Q4 → **N.R** → V.D → P.D).
Extracts the explorer row cell into a reusable Svelte 5 `NodeRow` primitive so the
shared render-runtime (**V.D**) later mounts ONE cell type instead of today's
heterogeneous mix (tree = `{@render}` snippet; grid/table/cards = imperative `createEl`).

Worktree: `C:/tmp/vaultman-uv2-nr` on branch `umbrella-v2/wave-1-nr` off sandbox `d81be5e`.

## Decisions (locked with dev, 2026-06-15)

- **N.R chosen** over V.D / migration as the next serial-spine slice (Q4 gates it;
  contained, de-risks V.D by unifying the cell first).
- **D-FE-1**: N.R = Svelte 5 cell (stack already on `@tanstack/svelte-virtual` +
  pretext; imperative-builder was premature). Lever for perf stays **V.D**.
- **Cell boundary = A1**: `NodeRow` owns the surface + content (icon · label ·
  fields · count · inline edit · badges) with a leading **affordance snippet**
  (tree passes indent guides + caret). The view keeps the positioned **outer row**
  (virtual `--vm-tree-y`, sticky layer, selection box, scroll/reveal, `data-id`,
  row-level handlers) — that is V.D's render-runtime turf, untouched here.
- **Headless scope = B1**: establish the canonical `data-vm-*` slot identity hooks
  NOW (D-PSS-2: `data-vm-*` stable identity + per-preset/view class vocabulary +
  `--vm-*` tokens). Additive — existing `vm-tree-*` classes + `NativeClassVocabulary`
  native classes preserved, so existing tests/CSS keep working.
- **Contract scope = anticipate the abanico, wire tree only** (Q1, D7 "designed-for,
  not implemented"): `NodeRow` defines slots for the full cell variety —
  `leading / icon / primary / fields / media / contentSnippet / metric / badges /
  trailing` + inline edit — but the tree pilot wires only the tree-relevant slots.
  `media / contentSnippet / metric / trailing` are defined-but-unwired snippet props
  (inert when omitted) so later view adoptions fill them WITHOUT reshaping the contract.
- **Metric vs StatCard (dev correction)**: the per-**node** numeric cell (prop count;
  **word count** = active codex work on the stable `1.1.x`/beta line) is the NodeRow
  `metric` slot — contract anticipated here, wired when the Files cell adopts NodeRow
  (D3 stable parity). The **Statistics page / StatCard** is NOT an explorer at all — it
  is its own **MyWorkspace panel** (D9), fully out of NodeRow scope.
- **Badge sub-primitive**: extract the 4×-duplicated `vm-badge` atom into
  `NodeBadgeZone` this slice (dev-approved). It renders wrapper-less (each view keeps
  its own zone wrapper → no box-model/CSS change).
- Component location: `src/components/views/` (with the views).

Full cell-variety survey + ADOPT/RESHAPE/MAP/DROP/DEFER classification across
proto v12 · sandbox · stable: [[01-cell-variety-abanico|shard 01]].

## Changes landed (worktree)

- **NEW** `src/components/views/NodeBadgeZone.svelte` — shared `vm-badge` atom list;
  `data-vm-badge` hook; `inherited` flag for child clusters; dumb (data + handlers in).
- **NEW** `src/components/views/NodeRow.svelte` — the cell. `module` export
  `NodeRowVocab` + `TREE_NODE_ROW_VOCAB` (per-view class vocabulary). Emits
  `data-vm-node-row / -icon / -label / -fields / -badges / -count`. Consumes
  `ExplorerRowInput`-derived content + `NativeClassVocabulary` + `stateModEmissions`.
- **EDIT** `src/components/views/viewTree.svelte` — `treeRow` snippet now renders
  `<NodeRow>` with a `{#snippet leading()}` (indent guides + caret); outer row kept.
  Removed now-dead `HighlightText` import, 4 badge-helper imports, and
  `hasVisibleCount / hasActiveRowBadge / handleInputKeydown / focus`.
- **NEW** tests: `test/component/views/NodeRow.test.ts` (5),
  `NodeBadgeZone.test.ts` (3) — guard the `data-vm-*` contract + state mirroring +
  badge delegation + edit swap.
- **UPDATED** snapshot `viewTree.panel.vaultman.snapshot.test.ts.snap` — additive
  `data-vm-*` attrs + whitespace cleanup only; reviewed diff = no structural/class loss.

## Verification status log

- svelte-check: **0 errors / 0 warnings** (1176 files).
- Svelte MCP autofixer: `issues: []` on `NodeRow.svelte` and `NodeBadgeZone.svelte`
  (declined one advisory `{@attach}`-over-`use:` suggestion for `focus` — codebase +
  the `icon` prop contract use `use:` actions; consistency wins).
- viewTree component suite: 64/66 pass; the 2 "fails" were the snapshot (regenerated,
  intended) and `viewTreeScrollFallback` (**timeout flake** — NodeRow cold-compile
  raced the 5s per-test cap; passes 8/8 isolated, no logic regression).
- New NodeRow/NodeBadgeZone tests: 8/8 pass.
- build: exit 0. `test:unit`: **1092/1092 pass** (lone file fail =
  `explorerNotebookNavigatorComparison`, external `@notebook-navigator` repo absent —
  the documented known-ajeno).
- `pnpm run verify` (chain `lint && check && build && test:unit && test:component`)
  aborts at `lint` on **7 PRE-EXISTING ajeno eslint errors** in untouched files
  (`explorerProps.ts` · `explorerTags.ts` · `typeViewConfig.ts`,
  `@typescript-eslint/no-unnecessary-type-assertion`; sandbox `d81be5e` content, masked
  by prior `eslint .` timeouts). Dev decision (2026-06-15): **option A** — leave as a
  known-ajeno pre-existing failure, keep the N.R commit pure (own files only). The N.R
  steps themselves are green (check/build/unit/component/autofixer above).

## Follow-ups (next slices, out of scope here)

- V.D shared render-runtime mounts `NodeRow` across engines (the real perf lever).
- Grid/Table/Cards adopt `NodeRow` (pass their own `vocab`; wire columns/media/metric).
- Files cell wires the `metric` slot for prop count + word count (reconcile with the
  stable `1.1.x` codex word-count work; D3 parity).
- `contentSnippet` slot wired for the Content explorer search-preview row.
- Promote the `data-vm-*` slot vocabulary into the headless style law doc once a
  second engine adopts it.

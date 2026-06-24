---
title: 01 — Cell-variety abanico (proto · sandbox · stable) for NodeRow
type: research-shard
status: active
parent: "[[docs/work/hardening/plans/2026-06-15-nr-noderow-cell/index|N.R NodeRow cell]]"
created: 2026-06-15T00:00:00
updated: 2026-06-15T00:00:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/research
  - explorer/cells
  - style/headless
  - umbrella-v2/wave-1
---

# 01 — Cell-variety abanico

Dev-requested survey before fixing the `NodeRow` boundary: read the FULL range of
explorer cells across the three streams so the primitive's slot contract is designed
against the whole variety, not just the tree cell. Method: coordinator read the 5
sandbox platform-view cells at full fidelity + 3 read-only Explore agents
(sandbox Data/Stats · stable `hotfix/1.0.2-css-scorecard` + `dev` · proto v12).

## Sandbox platform-view cells (read directly)

| Cell | Build | Leading | Icon | Label | Fields/Cols | Media | Badges | Count/Metric | Edit |
|---|---|---|---|---|---|---|---|---|---|
| viewTree (`treeRow` snippet) | Svelte `{@render}` | indent guides + caret | ✓ | +prefix +HighlightText | field-zone | — | direct + child-pill + hover | count | inline input |
| ViewNodeList | Svelte `{#each}` | depth-indent | ✓ | + detail | — | — | label+icon badges | — | — |
| ViewNodeTable | Svelte + columns | — | ✓ (label col) | `vm-node-table-primary` | **N columns + header + sort** | — | direct (label col) | count/files cols | — |
| ViewNodeGrid (`nodeTile`) | Svelte `{@render}` | inline-toggle (opt) | ✓ (+placeholder) | +prefix | grid fields (count field) | — | direct + hover | count field | — |
| ViewNodeCards | Svelte `{#each}` | — | ✓ (+placeholder) | title field | title/meta fields | **`vm-node-card-cover`** | direct | (count field) | — |

Key: the `vm-badge` atom is **duplicated verbatim** in tree/table/grid/cards; the
leading affordance varies per view → both confirm A1 (content cell + affordance slot).

## Cross-stream slot union + classification

| Slot | Who uses it | Tree pilot | Classification |
|---|---|---|---|
| Leading affordance (caret/indent/toggle) | tree, grid, proto guides+sticky | wired (snippet) | ADOPT as slot |
| Icon (+placeholder) | all | wired | ADOPT |
| Primary label (+prefix +highlight) | all; content = search-preview + line# prefix | wired | ADOPT |
| Fields zone (0..N) | tree/grid/cards/list | wired | ADOPT |
| Badge zones (direct/child/hover/queue) | all; dup 4× + stable bubble-up | wired (via NodeBadgeZone) | ADOPT + extract |
| Metric/numeric cell (prop count; **word count = stable `1.1.x` codex**; dates; prop-type) | Files table sandbox+stable; word count = stable `dev`/beta only | defer-wire | ADOPT to contract |
| Media/cover/thumbnail | cards; proto (even tree rows); stable Files grid | defer-wire | ADOPT to contract |
| Content snippet (multi-line clamped) | content explorer; proto `vm-cell-content` | defer-wire | ADOPT to contract |
| Columns (N) + header/sort + RESIZERS | table sandbox; **resizers = stable-only delta** | — | table-layout concern; RESHAPE at table adoption (resizers = D3 parity debt) |
| Inline edit (+ proto suggestions menu) | tree input; proto stack | wired (basic) | ADOPT basic / DEFER suggestions |
| Link affordance (`data-href`/draggable) | stable Files name cell | — | MAP at Files adoption |
| Niagara index rail / marquee | proto / sandbox | — | separate primitives (not the cell) |
| Stat-cards + scope-pills + meta island | sandbox+stable Statistics PAGE | — | **separate MyWorkspace panel (out of NodeRow)** |
| Stack-row (operator/grip/suggestions) | proto stack-island | — | different primitive (filter/queue = MyWorkspace) |

## Dev corrections (2026-06-15)

- **StatCard / Statistics page is NOT an explorer** — it is its own **MyWorkspace
  panel** (D9: panels/surfaces/scenes), not a Symbiont Explorer cell. Excluded from
  the NodeRow abanico entirely (earlier draft over-reached by listing it as a cell).
- **"Word count" = per-NODE metric cell** (the explorer row's numeric cell), which
  **codex is building on the stable `1.1.x` / `1.1.0-beta` line right now**. It is the
  NodeRow `metric` slot (contract anticipated; wired at Files-cell adoption, reconciled
  with codex's work). NOT the Statistics word-count stat.

## Proto v12 richness to anticipate (merge input, not canonical)

Proto cells (React/JSX, `explorer.jsx` / `nautilus.jsx` / `stack-island.jsx`) add:
media thumbnail (`vm-cell-media`, shape-aware) · multi-line content snippet
(`vm-cell-content`) · depth/level chips · meta pills · inline-edit + suggestions menu ·
sticky-parent tracking · DnD position hints · draggable cell-slot reorder (DEFER) ·
Niagara magnify index rail + marquee (RESHAPE → separate primitives, not the cell).
The `metric / media / contentSnippet / trailing` NodeRow slots + the `leading` snippet
cover the structural variety; power-user choreography (cell reorder, index rail) stays
out of the cell.

## Verification ledger

- Package/stack facts cross-checked vs the frontend-stack research
  [[docs/work/hardening/research/2026-06-15-frontend-stack-deep-research/index|ledger]].
- Stable cells read via `git show hotfix/1.0.2-css-scorecard:…` and `dev` (`bea07c7`) —
  no worktree tree-walk. Word-count `words` column confirmed on `dev` (commit `c95cefa`),
  NOT on `hotfix`; sandbox lacks it.
- StatCard-as-panel classification anchored in D9 (umbrella shard 01).

---
title: EDP-009 row-input vocabulary decision
type: decision-record
status: active
parent: "[[docs/work/hardening/issues/explorer-data-plane/009-adapter-row-contract-follow-up|EDP-009]]"
created: 2026-05-13T06:19:06
updated: 2026-05-13T06:59:35
tags:
  - agent/decision
  - initiative/hardening
  - explorer/views
created_by: codex
updated_by: codex
---

# EDP-009 Row-Input Vocabulary Decision

## Decision

G0 freezes the shared adapter row-input vocabulary in
`src/services/serviceExplorerRowInput.ts`.

`ExplorerRowInput` is the compatibility row contract for tree, grid, table, and
cards until G1 and G2 migrate their component inputs. It has one semantic row
identity:

- `id`: stable row id used for item keys, reveal lookup, and callback ids.
- `callbackId`: explicit callback id; G0 sets it equal to `id`.
- `source`: `snapshot`, `tree-node`, or `view-row`.
- `node`, `label`, `detail`, `icon`, `cls`, `depth`, `layers`,
  `cells`, `actions`, and `disabled`: render payload already used by the
  adapters.
- `parentId`, `childrenIds`, `domainKey`, and `path`: snapshot lookup metadata
  available when the input came from `ExplorerSnapshotRow`.

The shared helpers intentionally stop at row identity, layer bridging, reveal
lookup, and row/group key derivation. They do not create, configure, own, or
share any virtualizer.

## Contract Helpers

- `rowInputFromSnapshotRow()` adapts `ExplorerSnapshotRow` to the shared row
  contract.
- `rowInputFromTreeNode()` preserves the legacy TreeNode compatibility path.
- `rowInputFromViewRow()` preserves existing table/card `ViewRow` payloads.
- `rowInputToTreeNode()` bridges `ViewLayers` back to legacy `TreeNode`
  decorations for adapters that still render `badges`, `highlights`, and
  `cls`.
- `buildRowInputIdIndex()` and `resolveRowInputRevealIndex()` define the
  shared reveal lookup inputs and stale-revision rejection rule.
- `rowInputVirtualKey()` and `rowInputGroupKey()` provide stable key strings;
  tree/table use single row ids, while grid/cards can keep adapter-local row
  grouping.

## Boundaries

- G0 does not migrate `viewTree.svelte`, `ViewNodeGrid.svelte`,
  `ViewNodeTable.svelte`, or `ViewNodeCards.svelte`.
- G0 does not touch selection mirror cleanup, sticky tree row rendering,
  performance thresholds, or Tags/Props snapshot internals.
- Existing table/card Polish behavior remains protected by `ViewRow` payload
  preservation in the contract test.
- SVAR compatibility bridge work is superseded. SVAR deletion remains a later
  cleanup after row-contract finalization; no SVAR bridge is preserved here.

## Verification

- RED: `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/services/serviceExplorerRowInput.test.ts`
  failed because `src/services/serviceExplorerRowInput` did not exist.
- GREEN: same command passed 1 file / 6 tests after adding the shared
  contract helpers.
- Integrated into `claude/explorer` with merge commit `071e490`; integration
  gates passed focused contract 1 file / 6 tests, relevant unit 6 files / 47
  tests, sticky component 4 files / 39 tests, `lint:full`, `check`,
  `build:plugin`, and `git diff --check`.

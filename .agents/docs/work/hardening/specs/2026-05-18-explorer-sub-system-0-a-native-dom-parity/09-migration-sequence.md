---
title: 09 — Migration sequence
type: spec-shard
parent: "[[2026-05-18-explorer-sub-system-0-a-native-dom-parity/index]]"
---

# 09 — Migration sequence

Vertical-slice 12 commits, TDD red→green per commit. Each commit independently verifiable. C12 (flicker fix) runs LAST so it does not block the contract work — and because its root cause is unknown today, requiring a systematic-debugging phase before any patch.

## Commit table

| # | Commit title | Scope |
|---|---|---|
| **C1** | `feat(0-A): extend ExplorerViewFeatureContract with nativeDomEmission + cellWrapper/coverImage/headerCell` | Type extensions (`NativeStateMod`, `NativeClassVocabulary`, `NativeDomEmission`), per-view literals (tree with `tree-item*` family; list/grid all-null; table with Bases table vocab; cards with Bases cards vocab including `bases-cards-cover`). `UNIVERSAL_DND_VOCAB` const + `ViewHostMountContext`, `InEditorMountContract`, `NoteContextProvider` types declared. No consumers wired yet. |
| **C2** | `feat(0-A): add serviceNodeElementVisibility with NodeElementMask + computeNodeElementMask` | Pure-function service `src/services/serviceNodeElementVisibility.ts`. Types `NodeElementMask`, `NodeElementOverrides`, `BadgeKindMask`, `NodeElementKind` in `src/types/typeViewHost.ts`. No consumers wired yet. |
| **C3** | `feat(0-A): add serviceViewHost runes class + Symbol context keys` | `src/services/serviceViewHost.svelte.ts` runes class with `preset`, `mountContext`, `viewMode`, `btnNodeElementsVisibility`, derivations (`selectableModes`, `nodeElementMask`, `multiSelectionAvailable`), methods (`setViewMode`, `toggleElement`, `toggleBadgeKind`, `resetOverrides`). `src/components/explorer/viewHostContext.ts` exports `VIEW_HOST_KEY`, `NODE_ELEMENT_MASK_KEY`, `PRESET_KEY` Symbols. No consumers wired yet. |
| **C4** | `feat(0-A): add ViewHost shell component with mode switch + context distribution` | `src/components/explorer/ViewHost.svelte` mounts the chosen view component, constructs `ViewHostService`, `setContext` for the 3 keys, runs the prune `$effect` for stale viewMode. Standalone; not yet mounted by panelExplorer. |
| **C5** | `refactor(0-A): extract view-host responsibility from panelExplorer to ViewHost mount` | Replace `panelExplorer.svelte` lines 1205-1380 inline mode switch with `<ViewHost>` mount. Keep markmap branch as outer fallback. Consolidate `is*Empty` derivations into `isCurrentViewEmpty`. Verify DOM snapshot baseline updated; no behavior regression in view-mode cycling. |
| **C6** | `refactor(0-A): wire 5 view components to consume NodeElementMask via context` | Each of viewTree, ViewNodeList, ViewNodeTable, ViewNodeGrid, ViewNodeCards adds `getContext(NODE_ELEMENT_MASK_KEY)` + gates per-element render on the mask. EDP-009 row input contract unchanged. Existing prop surface preserved. |
| **C7** | `feat(0-A): wire overlayViewMenu — preset.viewModes filter + btnNodeElementsVisibility submenu` | overlayViewMenu reads `viewHost.selectableModes` and renders `btnNodeElementsVisibility` submenu (`ViewMenuNodeElementsToggle.svelte`, new) when `multiSelectionAvailable`. Submenu = inline expand + flat badge group + Reset button. **Rename `btnMultiSelection` → `btnNodeElementsVisibility` across `src/`, `test/`, `.agents/docs/`** (grep + replace with annotation). Feature-contract gating: hide submenu when `features.nodeElementToggles=false` for current view. |
| **C8** | `refactor(0-A): standardize native-class emission per view per preset.useNativeDom` | Each view component reads `explorerViewContract(viewMode).nativeDomEmission[mountContext]` from context and emits classes per the data-driven rule. **Behavior-relevant**: table/cards row roots switch from `.nav-file` to `.bases-tr` / `.bases-cards-item`; grid drops native classes; tree literals come from the contract (no change in values). Add `src/services/serviceNodeClassEmission.ts` if a shared helper is needed. Visual smoke per preset. |
| **C9** | `refactor(0-A): standardize DnD state mod emission via UNIVERSAL_DND_VOCAB` | View components emit `is-being-dragged`/`is-being-dragged-over` when `useNativeDom=true`, `vm-drag-source`/`vm-drop-target` when false. drop-indicator element emits universal classes when native. Services (`serviceDnd`, `serviceManualDnd`) NOT modified. dnd-kit NOT modified. |
| **C10** | `docs(0-A): in-editor seam vocabulary shard + InEditorMountContract types` | Type-only commit. `08-in-editor-seam-vocabulary.md` published as committed shard. `ViewHostMountContext`, `InEditorMountContract`, `NoteContextProvider` types in `typeViewHost.ts` (if not already in C1; ensure final shape). No implementation. |
| **C11** | `test(0-A): diagonal verification matrix + invariant gates` | Consolidates the 5 panel × vaultman DOM snapshots, the 1 native cross-check (viewTree vs obsidian-web-lab), and all invariant unit tests not added in earlier commits. Live `plugin-dev` smoke run captured in commit message. Lint + build clean. |
| **C12** | `fix(0-A): eliminate node-element hide/show flicker during scroll` | systematic-debugging phase: reproduce flicker, locate root cause (candidates: `serviceExplorerScrollGeometry`, `serviceNodeRowMeasure`, `serviceNodeRowStyle`, Table/Grid scroll-idle guardrails from 2026-05-16 repair). Patch scoped to render gate, not to defer mechanism unless defer IS the cause. Smoke harness adds frame-level assertion: ‘no frame where row container exists but children are empty’. |

## Dependency graph

```
C1 ──┬──> C2 ──> C3 ──> C4 ──> C5 ──┬──> C6 ──┬──> C8 ──> C9 ──> C10 ──> C11 ──> C12
     │                              │         │
     └────────────────────────────> C7 ───────┘
```

- C7 depends on C3 (viewHost service) and C1 (contract). Can run in parallel with C6 if implementer wishes.
- C8 depends on C6 (mask wiring in views) because emission helper reads mask + preset; cleaner if mask wiring lands first.
- C12 depends on C11 only for the smoke harness assertion add;
  can otherwise start anytime after C8.

## Rollback boundaries

- **Before C5**: panelExplorer untouched. ViewHost, services, context keys exist as unconsumed modules. Rollback = revert C1-C4 cleanly.
- **Before C6**: ViewHost mounted by panelExplorer but views don't gate on mask yet. Mask exists but has no UI effect.
- **Before C7**: overlayViewMenu still hardcodes view-mode list;
  `btnNodeElementsVisibility` submenu absent. preset.viewModes filter not enforced.
- **Before C8**: native-class emission is still hardcoded in view components (existing behavior pre-0-A). Mask works; class vocab not data-driven yet.
- **Before C12**: contract + wiring + native vocab + DnD all working. Flicker bug remains as it does today.

## TDD discipline per commit

Each commit follows red→green:

1. Write failing test(s) for the new behavior.
2. Implement just enough to make the tests pass.
3. Refactor if needed without breaking the tests.
4. Run `pnpm verify` locally; all gates green.
5. Commit.

Verification gates per commit listed in `10-verification-matrix.md`.

## Branch hygiene

- Work on `sandbox` branch (current canonical) or a feature branch created from `sandbox`.
- Each commit lands its own focused diff; no batch commits.
- No merges to `main` from this branch (AGENTS.md policy: zero AI files on `main`).
- If pre-commit hooks fail, fix the underlying issue and create a NEW commit; never amend.
- If a commit lands a regression discovered later, revert in a new commit rather than rewriting history.

## Estimated effort

- C1-C4 (foundation modules): 1-2 sessions each, ≈4-8 sessions total.
- C5 (panelExplorer extraction): 1-2 sessions; the larger risk due to surface area.
- C6 (view component mask consumption): 1 session per view approximately, or 1 batch session if tackled together (recommendation: per-view sub-commits inside C6 commit if diffs are large).
- C7 (overlayViewMenu + rename): 1 session.
- C8 (native-class emission audit): 1-2 sessions (visual inspection across 5 views × 2 presets).
- C9 (DnD vocab): 1 session.
- C10 (docs + types): 1 session.
- C11 (verification consolidation): 1 session.
- C12 (flicker fix): unknown; could be 1-3 sessions depending on root cause complexity.

Total: ≈14-20 sessions worth of focused work. Calendar time depends on agent throughput.

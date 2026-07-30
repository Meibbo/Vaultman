---
title: 10 — Verification matrix
type: spec-shard
parent: "[[2026-05-18-explorer-sub-system-0-a-native-dom-parity/index]]"
---

# 10 — Verification matrix

Diagonal coverage locked in brainstorm: representative cells + invariant unit tests + live smoke. Full 20-cell matrix and adversarial scroll harness deferred to Sub-system 0-A.S.

## Unit tests (per-commit gates)

| Test file | Scope | Added in |
|---|---|---|
| `test/unit/services/serviceExplorerViewContract.test.ts` (extend existing) | Contract shape exhaustiveness, per-view literal correctness, `UNIVERSAL_DND_VOCAB` const integrity, `NativeStateMod` union completeness, `null` semantics | C1 |
| `test/unit/services/serviceNodeElementVisibility.test.ts` | `computeNodeElementMask` determinism, lock-overrides invariant, media-always-off, badge sub-merge correctness, no-input-mutation, `null` vs `undefined` overrides equivalent | C2 |
| `test/unit/services/serviceViewHost.test.ts` | Runes class state, `selectableModes` derivation, `nodeElementMask` derivation, `multiSelectionAvailable` derivation including feature-contract gating, `toggleElement`/`toggleBadgeKind`/`resetOverrides` semantics, preset-switch preservation, override dormancy/reassertion | C3 |
| `test/component/explorer/ViewHost.test.ts` | DOM snapshot per viewMode mount, context propagation (3 keys), viewMode prune on preset switch, no double mount, no leak on unmount | C4 |
| `test/component/containers/panelExplorerViewHostMount.test.ts` | Before/after extraction snapshot diff, all 6 view modes routable (5 platform via ViewHost + markmap outer), empty-state fallback preserved | C5 |
| `test/component/views/*.NodeElementMask.test.ts` (5 files, one per view) | Per-view mask gating: each `NodeElementKind` flag flips visibility of the right DOM children, media cover render only on cards, badge sub-kind granularity | C6 |
| `test/component/overlays/overlayViewMenu.test.ts` (extend existing) | viewModes filter rendering, submenu visibility per preset, submenu visibility per feature-contract `nodeElementToggles` flag, toggle propagation, reset, rename `btnMultiSelection` → `btnNodeElementsVisibility` reflected | C7 |
| `test/component/views/*.NativeClassEmission.test.ts` (5 files) | Per-view native-class emission: tree emits tree-item*, table emits bases-tr/bases-td/bases-table-cell/bases-table-header, cards emits bases-cards-item/bases-cards-property/bases-cards-cover, list & grid emit no native classes, vm-* always on | C8 |
| `test/component/views/*.DndStateMods.test.ts` (5 files, or 1 consolidated) | DnD class emission per preset (native → is-being-dragged; vm → vm-drag-source), drop-indicator element classes, no service modification | C9 |
| `test/unit/types/typeViewHost.compile.test.ts` | Type-only test: `InEditorMountContract`, `NoteContextProvider`, `ViewHostMountContext`, `UNIVERSAL_DND_VOCAB` shape stable | C10 |

## Component DOM snapshots — panel × vaultman preset (5 baseline cells)

Added in C11 (or rolled in earlier per commit). Each captures the full rendered DOM for the view component with a representative row input, asserting class strings, attribute presence, and nesting:

| Snapshot test file | View | Preset | Context |
|---|---|---|---|
| `test/component/views/viewTree.panel.vaultman.snapshot.test.ts` | tree | vaultman | panel |
| `test/component/views/ViewNodeList.panel.vaultman.snapshot.test.ts` | list | vaultman | panel |
| `test/component/views/ViewNodeTable.panel.vaultman.snapshot.test.ts` | table | vaultman | panel |
| `test/component/views/ViewNodeGrid.panel.vaultman.snapshot.test.ts` | grid | vaultman | panel |
| `test/component/views/ViewNodeCards.panel.vaultman.snapshot.test.ts` | cards | vaultman | panel |

Snapshot must include: row root classes, primaryLabel classes, state mods (selected / focused / active), badge containers per sub-kind, media slot conditional, DnD state classes when drag flags are set in fixture.

## Native preset cross-check — viewTree only (1 cell)

`test/component/views/viewTree.panel.native.crosscheck.test.ts` — mounts viewTree with `PRESET_NATIVE` (forcing `useNativeDom=true`) and compares the emitted DOM against a snapshot extracted from `C:\Users\vic_A\Desktop\obsidian-web-lab\obsidian\app.css`-driven file-explorer DOM. Pass = identical class structure on row root + inner + children. Tolerance: text content and child order may differ; CSS class strings on structural elements may not.

The fixture for the obsidian-web-lab tree DOM is captured into `test/fixtures/obsidian-web-lab/file-explorer-tree.html` during C11 and committed alongside the test.

Table/Cards cross-check against Bases is intentionally NOT in 0-A scope. Verifying that emission matches Bases' literal class strings is covered by the unit tests in C8 (which assert against the contract literals, which were authored from obsidian-web-lab research). A future Sub-system "Bases parity verification" can add Bases live cross-check if needed.

## Live plugin-dev smoke flow

Executed in C11 commit message; re-run in C12. Sequence:

```text
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev command id=vaultman:open

# 1. Preset toggle cycle
obsidian vault=plugin-dev eval code="plugin.themeService.setPreset('native')"
   assert: overlayViewMenu shows only Tree button
   assert: btnNodeElementsVisibility submenu DOM absent
obsidian vault=plugin-dev eval code="plugin.themeService.setPreset('vaultman')"
   assert: overlayViewMenu shows 5 mode buttons
   assert: btnNodeElementsVisibility submenu visible
obsidian vault=plugin-dev eval code="plugin.themeService.setPreset('native')"
   assert: viewMode pruned to tree if was non-tree

# 2. View-mode cycle (vaultman preset)
obsidian vault=plugin-dev eval code="plugin.themeService.setPreset('vaultman')"
for mode in [tree, list, table, grid, cards]:
   obsidian eval code="...service.setViewMode('${mode}')..."
   wait 200ms
   obsidian eval code="document.querySelector('.vm-view-host-container').innerHTML.length"
   assert: > 0

# 3. btnNodeElementsVisibility interaction
obsidian eval code="...service.toggleElement('media')..."
   wait 100ms
   in cards mode: assert .bases-cards-cover present on rows with mediaDescriptor
obsidian eval code="...service.toggleElement('badges')..."
   wait 100ms
   assert: all badge DOM gone
obsidian eval code="...service.resetOverrides()..."
   wait 100ms
   assert: mask back to baseMaskFromPreset(vaultman) — media off, badges on, etc.

# 4. Selection + DnD smoke
manual: Ctrl+click two tree rows
   assert: selectedIds size = 2
   assert: each row has vm-is-selected (and is-selected if native)
manual: drag a row, hover another folder
   assert: source row has vm-drag-source / is-being-dragged class
   assert: target row has vm-drop-target / is-being-dragged-over class
   assert: drop-indicator element rendered with class
manual: release on target
   assert: drag classes removed, selection state consistent

# 5. Scroll burst (C12 verification)
pnpm smoke:scroll -- --view=cards --jumps=100
   assert: zero frames where any visible row container has empty children slot
   assert: existing perf gates still pass (blankFrames=0, maxBlank=0ms)

# 6. Dev errors check
obsidian vault=plugin-dev dev:errors
   assert: "No errors captured."
```

## Invariant audit gates (final, C11)

```typescript
test('media-always-false in PRESET_NATIVE.nodeElements');
test('media-always-false in PRESET_VAULTMAN.nodeElements default');
test('lockNodeElementVisibility=true ⇒ btnNodeElementsVisibility submenu DOM not rendered');
test('lockNodeElementVisibility=true ⇒ computeNodeElementMask ignores overrides');
test('EXPLORER_PLATFORM_VIEW_MODES excludes markmap and any future deferred view');
test('selectableModes = preset.viewModes ∩ EXPLORER_PLATFORM_VIEW_MODES');
test('feature-contract gating: view with nodeElementToggles=false hides submenu regardless of preset');
test('panel mode and in-editor mode emit DIFFERENT vocab slices per contract');
test('EDP-009 ExplorerRowInput shape unchanged from pre-0-A snapshot');
test('NodeSelectionService remains sole owner of selection state');
test('serviceDnd source file unchanged across 0-A commits');
test('serviceManualDnd source file unchanged across 0-A commits');
test('TanStack virtualizer setup unchanged across 0-A commits');
test('serviceExplorerScrollGeometry public API unchanged (signature) across C1-C11');
```

`pnpm verify` post-C11 expected: unit ≥ baseline + new tests, component ≥ baseline + new tests, lint 0 errors, build clean.

## Performance gates

Match or beat current baseline (from [[docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/perf-baseline|Explorer View Platform perf baseline]]):

- Notebook Navigator comparison bridge: Vaultman 50K projection faster than NN list builder (current: 26.96 ms vs 61.15 ms).
- Live `plugin-dev` per-view burst smoke: `blankFrames=0`, `maxBlank=0ms`, no dev errors.
- Per-view maxDelay current baselines (informational, not gates):
  Tree 108 ms, List 258 ms, Table 1312 ms, Grid 600 ms, Cards 24 ms.
- **C12 success target**: ZERO frames during scroll burst where a visible row container exists but its mask-gated children (icon/label/detail/badges/media) are absent or empty.

Adversarial scroll patterns (P1-P5 from brainstorm), 3-plugin sequential comparison, and real-scroll synthetic-event harness rebuild are explicitly OUT of 0-A scope; tracked in Sub-system 0-A.S.

## Failure semantics

Any failed invariant or snapshot mismatch = no merge. Failed performance gate = investigate before merge (perf regression under a foundational refactor is unacceptable). Smoke errors in `dev:errors` = no merge.

If C12 cannot reproduce the flicker on the smoke harness (e.g., because jump-cheat does not exercise real scroll), the C12 verification falls back to manual `plugin-dev` observation + agent description; mark this as a known limitation and tag for 0-A.S harness rebuild to provide automated regression coverage.

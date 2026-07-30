---
title: Explorer Sub-System 0-A — Implementation plan
type: plan-index
status: ready
parent: "[[docs/work/hardening/specs/2026-05-18-explorer-sub-system-0-a-native-dom-parity/index|0-A spec]]"
created: 2026-05-18T00:00:00
updated: 2026-05-18T00:00:00
tags:
  - agent/plan
  - initiative/hardening
  - explorer/view-host
  - explorer/native-dom-parity
---

# Explorer Sub-System 0-A — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `ExplorerViewFeatureContract` with native-DOM-vocabulary fields, introduce a `NodeElementMask` presentation service, extract a context-agnostic `ViewHost.svelte` shell from `panelExplorer.svelte`, wire the `preset.viewModes` / `preset.nodeElements` / `preset.lockNodeElementVisibility` consumers that 0-B left declare-only, rename `btnNodeElementsVisibility` to `btnNodeElementsVisibility`, and declare (without implementing) the in-editor mount seam so the future in-editor renderer fast-follow has a complete contract.

**Architecture:** New `src/components/explorer/ViewHost.svelte` shell + `viewHostContext.ts` Symbol keys + `serviceViewHost.svelte.ts` runes class + `serviceNodeElementVisibility.ts` pure-function service. View components consume the mask via context and emit native classes data-driven from `nativeDomEmission[mountContext]` literals. DnD vocab is a shared `UNIVERSAL_DND_VOCAB` const; services (`serviceDnd`, `serviceManualDnd`, dnd-kit) stay untouched. Honest-hybrid emission: tree gets full `tree-item*` family, table/cards get Bases vocab (`bases-tr`, `bases-cards-item`, `bases-cards-cover`), list/grid stay `vm-*`-only.

**Tech Stack:** TypeScript, Svelte 5 runes (`$state`, `$derived`, `$bindable`, `$effect`), Svelte Context API with typed Symbol keys, vitest (unit + component), `@testing-library/svelte`, `pnpm verify`, Obsidian CLI for `plugin-dev` live smoke.

---

## Source spec

[[docs/work/hardening/specs/2026-05-18-explorer-sub-system-0-a-native-dom-parity/index|0-A spec]] (12 shards, ≈2550 lines, drafted 2026-05-18). Plan derives directly from the 12-commit migration sequence in shard 09.

## Sequencing

Locked build order: `0-H ✅ → 0-B ✅ → O ✅ → 0-A → N`. After 0-A: unlocks Sub-systems 6 (Layout extension), 7 (Toolbar contract), 12 (bits-ui adoption), and the in-editor renderer fast-follow. Adversarial scroll harness work (Sub-system 0-A.S) is a sibling track that does not block 0-A.

## Task list

- [[00-pre-step-baseline]] — Capture pre-0-A baseline (verify, snapshot, smoke)
- [[01-c1-extend-contract]] — C1: extend `ExplorerViewFeatureContract` with `nativeDomEmission` + `UNIVERSAL_DND_VOCAB`
- [[02-c2-mask-service]] — C2: add `serviceNodeElementVisibility` with `NodeElementMask` + pure functions
- [[03-c3-viewhost-service]] — C3: add `serviceViewHost` runes class + Symbol context keys
- [[04-c4-viewhost-shell]] — C4: add `ViewHost.svelte` shell with mode switch + context distribution
- [[05-c5-panel-extraction]] — C5: replace panelExplorer inline mode switch with `<ViewHost>` mount
- [[06-c6-view-mask-wiring]] — C6: wire 5 view components to consume `NodeElementMask` via context
- [[07-c7-overlay-view-menu]] — C7: wire overlayViewMenu — `preset.viewModes` filter + `btnNodeElementsVisibility` submenu + rename
- [[08-c8-native-class-emission]] — C8: data-driven native-class emission per view per preset
- [[09-c9-dnd-vocab]] — C9: standardize DnD state mod emission via `UNIVERSAL_DND_VOCAB`
- [[10-c10-in-editor-seam-docs]] — C10: in-editor seam vocabulary shard + `InEditorMountContract` types
- [[11-c11-verification-matrix]] — C11: diagonal verification matrix + invariant gates consolidation
- [[12-c12-flicker-fix]] — C12: eliminate node-element hide/show flicker during scroll (runs LAST)
- [[13-verification-gates]] — Final aggregation: full `pnpm verify`, lint, build, live smoke

## Dependency graph

```
C1 ──┬──> C2 ──> C3 ──> C4 ──> C5 ──┬──> C6 ──┬──> C8 ──> C9 ──> C10 ──> C11 ──> C12
     │                              │         │
     └────────────────────────────> C7 ───────┘
```

## Preserve constraints (per spec)

- EDP-009 `ExplorerRowInput<NodeBase>` shape identical.
- `NodeSelectionService` remains sole authority for selection state.
- No direct VFS mutation paths added.
- `serviceDnd` / `serviceManualDnd` / dnd-kit untouched.
- `serviceExplorerScrollGeometry` / `serviceNodeRowMeasure` public API stable (except possibly during C12 root-cause analysis; escalate if change is needed).
- `themeService` instance + `useNativeDom` derivation preserved.
- TanStack virtualization untouched.
- `EXPLORER_PLATFORM_VIEW_MODES = ['tree','list','table','grid','cards']` — no markmap, no outline.
- Map / ViewNodeMap deferred.
- Media slot defaults OFF in every preset.
- `main` branch zero AI workflow files.
- Obsidian CLI live tests use explicit `vault=plugin-dev`.

## Status

- Status: 🟡 plan ready, awaiting execution mode choice.
- Branch: `sandbox` (canonical).
- Estimated effort: ≈14-20 focused sessions across the 12 commits (per spec shard 09).
- Rollback boundaries documented per commit shard.

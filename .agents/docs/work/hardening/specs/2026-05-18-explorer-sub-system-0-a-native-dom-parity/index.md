---
title: Explorer Sub-System 0-A — Native-DOM parity + View Feature Contract + view-host extraction
type: spec-index
status: draft
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-18T00:00:00
updated: 2026-05-18T00:00:00
tags:
  - agent/spec
  - initiative/hardening
  - explorer/view-host
  - explorer/native-dom-parity
  - explorer/refactor
---

# Explorer Sub-System 0-A — Native-DOM Parity + View Feature Contract + View-Host Extraction

Third Phase 0 sub-system after 0-H (virtualizer list mode) and 0-B
(serviceTheme token layer), and after O (frameVaultman decomposition).
0-A extends the existing
[`ExplorerViewFeatureContract`](../../../../../src/services/serviceExplorerViewContract.ts)
with native-DOM-vocabulary fields, introduces a `NodeElementMask`
presentation service, extracts a context-agnostic `ViewHost.svelte`
shell from `panelExplorer.svelte`, wires the
`preset.viewModes` / `preset.nodeElements` / `preset.lockNodeElementVisibility`
fields that 0-B left declare-only, renames the user-visible
`btnNodeElementsVisibility` control to `btnNodeElementsVisibility`, and declares
(without implementing) the in-editor mount seam so that the future
in-editor renderer fast-follow has a complete contract to build against.

The spec is the formal successor to the Phase 0 ambition "Native-DOM
parity + View Feature Contract" tracked at line 41 of
[[docs/work/roadmap-overview|roadmap-overview]] as status 🟠 with no
prior dedicated spec. Approval of this spec moves the roadmap entry
to status 🟡 with a link here.

## Decision summary

- **Architecture A — ViewHost component + Context API.** Extract
  `src/components/explorer/ViewHost.svelte` analogous to O's
  `FrameNavbarShell` / `FrameDashboardShell`. ViewHost owns the
  mode switch, sets three typed-Symbol contexts (`VIEW_HOST_KEY`,
  `NODE_ELEMENT_MASK_KEY`, `PRESET_KEY`), and mounts the chosen
  view component. Future in-editor renderer mounts the same
  ViewHost with `mountContext='in-editor'`.
- **Architecture B — Presentation service produces `NodeElementMask`.**
  New `src/services/serviceNodeElementVisibility.ts` provides
  `computeNodeElementMask(preset, overrides) → NodeElementMask`.
  Pure function. Single source of truth for "render icon / label /
  detail / media / badges / actions per row". View components gate
  rendering on the mask consumed via context.
- **In-editor seam declared, not built.** 0-A produces types
  (`ViewHostMountContext`, `InEditorMountContract`,
  `NoteContextProvider`) plus a markdown shard `08-in-editor-seam-vocabulary.md`
  enumerating the class-vocabulary contract per (view × preset ×
  context) cell. No real `mountInEditorViewHost()` implementation.
  Fast-follow sub-phase implements the renderer against the locked
  vocabulary.
- **btnNodeElementsVisibility state in `ViewHost` runes service,
  panel-scoped, in-memory only.** No settings persistence.
  Theme Builder owns the persistence layer when it lands. Overrides
  are preserved across viewMode change and across preset toggle within
  the same panel lifetime; dormant when `preset.lockNodeElementVisibility`
  is true, reassert when it flips false.
- **Honest hybrid native-class emission.** viewTree emits the full
  `tree-item*` family. `ViewNodeList` emits no native classes
  (Obsidian has no flat-list analogue). `ViewNodeTable` emits the
  Bases vocabulary (`bases-tr`, `bases-table-cell`, `bases-td`,
  `bases-table-header`). `ViewNodeCards` emits the Bases vocabulary
  (`bases-cards-item`, `bases-cards-property mod-title`,
  `bases-cards-property`, `bases-cards-cover` for media slot).
  `ViewNodeGrid` emits no native classes — Bases has no grid analogue
  and Vaultman's grid is structurally specific. `vm-*` classes
  always emit; native classes emit additively when
  `preset.useNativeDom === true`.
- **Vertical-slice 12 commits, TDD red→green.** Each commit
  independently verifiable. C12 (flicker fix during scroll) runs
  last so it does not block the contract work.
- **Diagonal verification coverage.** 5 DOM snapshots (each view ×
  vaultman preset × panel), 1 native-preset cross-check (viewTree
  vs obsidian-web-lab), invariant unit tests, live `plugin-dev`
  smoke. Adversarial scroll harness deferred to sibling
  Sub-system 0-A.S.
- **DnD vocab universal, services untouched.** New module
  `UNIVERSAL_DND_VOCAB` exports the canonical class strings
  (`is-being-dragged`, `is-being-dragged-over`, `drop-indicator`,
  `drag-ghost`, `body.is-grabbing`). `serviceDnd` and
  `serviceManualDnd` and the dnd-kit library remain untouched —
  the view component swaps the literal CSS class strings based on
  `preset.useNativeDom`, services stay preset-agnostic.

## Locked non-goals

- No in-editor renderer (`mountInEditorViewHost` real,
  MarkdownView / CodeMirror / Decoration wiring) — fast-follow.
- No SCSS → UnoCSS mass migration (Sub-system N).
- No `preset.dock` / `preset.tabs` / `preset.toolbar.buttons`
  wiring (Sub-systems 6 / 7).
- No `preset.unload` / `preset.colors` / `preset.layout` /
  `preset.workspaceId` wiring (future sub-systems).
- No change to EDP-009 `ExplorerRowInput<>` shape.
- No rewrite of `panelExplorer.svelte` beyond the view-host
  extraction (C5).
- No change to view-component virtualization or row measurement.
- No new view mode (Map / ViewNodeMap deferred; outline view deferred).
- No change to `NodeSelectionService` authority.
- No DnD behavior change (services untouched).
- No settings-level persistence for `btnNodeElementsVisibility`
  toggles.
- No per-preset viewMode memory (Theme Builder territory).
- No Bases data-plane consumption / replacement / overlay
  coexistence — Provider Extensibility sub-system.
- No Polished preset rewrite integration — dedicated session
  post-0-A.
- No Action Routing Contract (cmenu / hover-badge / toolbar /
  keyboard / modifier distribution) — future sub-system.
- No adversarial scroll harness rebuild — Sub-system 0-A.S.

## Shards

- [[01-architecture]] — component graph, file layout, principles, non-goals, preserve constraints
- [[02-extended-view-feature-contract]] — TypeScript shapes, per-view `nativeDomEmission` literals (Bases-corrected)
- [[03-node-element-mask-service]] — `serviceNodeElementVisibility.ts` pure-function spec + invariants
- [[04-view-host-shell]] — `serviceViewHost.svelte.ts` runes class + `ViewHost.svelte` shell
- [[05-panel-explorer-extraction]] — `panelExplorer.svelte` view-host extraction (C5 before/after)
- [[06-overlay-view-menu-wiring]] — `preset.viewModes` filter + `btnNodeElementsVisibility` submenu
- [[07-native-class-emission-rules]] — per-view emission rules + `UNIVERSAL_DND_VOCAB`
- [[08-in-editor-seam-vocabulary]] — class-vocabulary cells + `InEditorMountContract` types + Outline tab pattern
- [[09-migration-sequence]] — C1-C12 commit plan with TDD red→green
- [[10-verification-matrix]] — diagonal coverage + invariant gates + smoke flow
- [[11-risks-and-followups]] — risks, parking lot, known unknowns

## Status

- Status: 🟡 spec-drafted, awaiting user review then writing-plans handoff.
- Sequence: locked build order `0-H ✅ → 0-B ✅ → O 🟢 → 0-A 🟡 → N`.
- Roadmap link: [[docs/work/roadmap-overview|roadmap-overview]] line 41 (0-A row).
- Unblocks: Sub-systems 6 (Layout extension), 7 (Toolbar contract),
  12 (bits-ui adoption preset), and the in-editor renderer fast-follow.
- Sibling carved out: Sub-system 0-A.S (Adversarial Scroll Harness
  + 3-Plugin Sequential Perf Comparison) — own brainstorm post-merge.

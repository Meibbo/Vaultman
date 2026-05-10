---
title: Current status
type: agent-status
status: active
parent: "[[docs/work/hardening/specs/2026-05-06-node-selection-service/index|node-selection-service]]"
archive_source: "docs/archive/hardening/active-docs/2026-05-06T050935-current-status.md"
compacted: true
created: 2026-05-04T01:36:20
updated: 2026-05-10T06:58:00
tags:
  - agent/current
created_by: dec
updated_by: codex
---

# Current Status

Initiative: hardening plus polish, preserving multifacet wave 2, inline grid
hierarchy, and TanStack node table context.

Archived completed/superseded status:
[[docs/archive/hardening/active-docs/2026-05-06T050935-current-status|2026-05-06 current status archive]].

## Active Rules

- User explicitly waived the no-commit rule and active-doc compactness rule for
  this task on 2026-05-06. Preserve detail first. Commits are allowed if useful
  for this work.
- Active agent Markdown files, including `current/status.md` and
  `current/handoff.md`, stay under 200 lines.
- Complete active-work detail belongs in the relevant initiative source record;
  `current/status.md` and `current/handoff.md` should carry only compact
  wikilinks, current state, next action, and blockers.
- Archive current-doc material only when it is superseded historical memory.
- Preserve source detail first; line limits are sharding or archive triggers,
  not permission to delete context.
- Timestamps use `YYYY-MM-DDTHH:mm:ss` with no timezone offset.
- Parent metadata uses one Obsidian wikilink in `parent`; do not use
  `parent_path`.
- `main` must contain zero AI files.

## Active Work

- Current active design:
  [[docs/work/hardening/specs/2026-05-06-node-selection-service/index|Node selection service and viewgrid spec]].
- Current active plan:
  [[docs/work/hardening/plans/2026-05-06-node-selection-service/index|Node selection service implementation plan]].
- Current multifaceted follow-up plan:
  [[docs/work/hardening/plans/2026-05-07-node-expansion-keyboard-grid/index|Node expansion, keyboard navigation, and hierarchical grid plan]].
- New active spec:
  [[docs/work/hardening/specs/2026-05-07-multifacet-2/index|Multifacet wave 2 spec]].
- New active plan:
  [[docs/work/hardening/plans/2026-05-07-multifacet-2/index|Multifacet wave 2 implementation plan]].
- Current user-approved polish spec:
  [[docs/work/polish/specs/2026-05-07-tanstack-node-table/index|TanStack node table]].
- Current user-approved polish plan:
  [[docs/work/polish/plans/2026-05-07-tanstack-node-table/index|TanStack node table implementation plan]].
- Completed Pretext/cards spec:
  [[docs/work/polish/specs/2026-05-10-pretext-grid-cards/index|Pretext grid cards hybrid layout]].
- Completed Pretext/cards implementation plan:
  [[docs/work/polish/plans/2026-05-10-pretext-grid-cards/index|Pretext grid cards implementation plan]].
- New multi-platform layout strategy:
  [[docs/work/polish/research/2026-05-09-multi-platform-layout-strategy|Multi-platform layout strategy]].
- Current selection debug and TanStack assimilation record:
  [[docs/work/hardening/research/2026-05-06-selection-tanstack-virtualizer-debug/index|Selection hang and TanStack virtualizer assimilation]].
- Standing engineering context:
  [[docs/current/engineering-context|Engineering context]], now linked from
  `start.md` so future sessions read it with status and handoff.
- Read-only exploration found that selection is split across
  `panelExplorer.svelte`, `viewTree.svelte`, current file-specific
  `viewGrid.svelte`, `logicKeyboard.ts`, and partial `ViewService` mirroring.
- Recommended implementation direction: service-first node selection, tree/grid
  adapters, and a generic node-grid adapter. The old file-specific grid should
  be renamed or isolated if compatibility is needed during transition.
- Current wave source:
  [[docs/work/hardening/specs/2026-05-06-user-facing-recovery-wave-a/index|User-facing recovery wave A]].
- Completed in wave A:
  A0 CMenu queue repair, A1 prop/value rename handoff, A2 tag/file rename
  handoff with prop queue ingestion follow-up, and A3 navbar badges and quick
  actions.
- Bases parser compatibility has resumed after wave A: `file.name.contains`,
  `file.folder.contains`, and `file.path.contains` now import as supported
  Vaultman file rules.
- Previous next slice was deeper Obsidian/Bases/Dataview parser compatibility.
  The user's latest request supersedes that with node selection service and
  viewgrid planning; the latest continuation is now the 2026-05-07 expansion,
  keyboard, and grid hierarchy plan linked above.

## Current Verification

- 2026-05-10 serviceDnd semantic foundation plus Svelte adapter DONE:
  [[docs/work/polish/plans/2026-05-10-service-dnd-foundation/index|serviceDnd semantic foundation]].
  Added a local DnD service contract with semantic drag source, candidate
  target, drop operation, reject reason, view-state projection, and drop
  result, plus an `@thisux/sveltednd` callback adapter. Version metadata is now
  `1.0.0-rc.2`.
- 2026-05-10 manual grid DnD continuation DONE:
  [[docs/work/polish/plans/2026-05-10-service-dnd-foundation/03-manual-grid-dnd|manual grid DnD continuation]].
  `pnpm run check` is unblocked; the sort menu now exposes an opt-in manual
  DnD toggle for the grid, with native tile dragging, local sibling reorder,
  snappy state styling, and Markdown/JSON workspace drag payloads.
- 2026-05-10 Table open freeze regression fixed:
  [[docs/work/polish/research/2026-05-10-table-open-freeze|Table open freeze diagnosis]].
  `ViewNodeTable` now avoids unbounded first-frame row rendering and
  TanStack row wrappers in the virtualized render path. Focused stress,
  table/panel/virtualizer suites, `check`, `lint`, `build`, and live
  Obsidian table smoke passed with clean `dev:errors` and console.
- 2026-05-10 Pretext/cards Tasks 5-6 plus CSS font snapshot follow-up DONE:
  [[docs/work/polish/plans/2026-05-10-pretext-grid-cards/05-card-view|Cards view component and panel route]]
  / [[docs/work/polish/plans/2026-05-10-pretext-grid-cards/06-verification|Verification and documentation]]
  / [[docs/work/polish/plans/2026-05-10-pretext-grid-cards/07-css-font-snapshot|CSS font snapshot follow-up result]].
  Cards route through `panelExplorer`; `ViewNodeCards` now resolves rendered
  title/meta CSS through `serviceNodeCardStyle` before measuring rows.
- 2026-05-10 Pretext/cards Task 4 DONE:
  [[docs/work/polish/plans/2026-05-10-pretext-grid-cards/04-view-menu-routing|View-menu and settings wiring]].
  `overlayViewMenu` now receives provider/view field definitions and visible
  fields from `pageFilters`, emits normalized explicit field changes, exposes
  Cards, and hides DnD. `pageFilters` persists field changes through
  `serviceNodeFieldVisibility` and forwards provider-specific visible fields
  through tabs into `PanelExplorer`. Verification passed: RED overlay callback
  failure, focused overlay 1 file/3 tests, Svelte autofixer on 8 components,
  `check`, `lint`, `build`, focused component 5 files/55 tests, full
  `test:unit` 80 files/546 tests, and full `test:component` 41 files/205
  tests after clearing CodeQL/Java language-server workers before broad runs.
- 2026-05-10 Pretext/cards Task 3 DONE:
  [[docs/work/polish/plans/2026-05-10-pretext-grid-cards/03-card-layout|Node card layout service]].
  Added `serviceNodeCardLayout` with provider-specific field extraction,
  injected text measurement, stable height buckets, and row-height aggregation.
  Verification passed: RED import failure, focused unit 1 file/5 tests,
  `check`, `lint`, `build`, and full `test:unit` 80 files/546 tests after
  clearing CodeQL/Java language-server workers before the broad run.
- 2026-05-10 Pretext/cards Task 2 DONE:
  [[docs/work/polish/plans/2026-05-10-pretext-grid-cards/02-pretext-measurement|Pretext measurement service]].
  Added `@chenglou/pretext@^0.0.6` and `serviceTextMeasure` with Pretext and
  fallback engines, prepared/layout caches, style-keyed options, and explicit
  cache clearing. Verification passed: focused unit 1 file/4 tests, `check`,
  `lint`, `build`, and full `test:unit` 79 files/541 tests after clearing
  leftover CodeQL/Java workers from the prior CodeQL run.
- 2026-05-10 Pretext/cards Task 1 DONE:
  [[docs/work/polish/plans/2026-05-10-pretext-grid-cards/01-field-visibility|Field visibility settings contract]].
  `viewFieldVisibility` is now a persisted settings field, and
  `serviceNodeFieldVisibility` owns provider/view field definitions,
  defaulting, unknown-field pruning, identity repair, toggling, and explicit
  save-only persistence. Verification passed: focused unit 1 file/7 tests,
  `check`, `lint`, and full `test:unit` 78 files/537 tests.
- 2026-05-09 revision-gated explorer model caches DONE:
  [[docs/work/performance/plans/2026-05-09-revision-gated-explorer-model-caches|Revision-gated explorer model caches]].
  Indexes now publish revisions; files/props/tags/content providers pass
  source plus queue/filter revisions into `ViewService`; semantic row layers
  are cached only when revisions are present, while selection/focus state stays
  outside the cache. Continuation added perf-probe counters for semantic cache
  hit/miss/evict. Latest local verification passed: `lint`, `check`, `build`,
  and `test:unit` (77 files / 530 tests).
- 2026-05-09 CodeQL performance guardrails DONE:
  [[docs/work/performance/plans/2026-05-09-codeql-guardrails|CodeQL performance guardrails]].
  `vaultman/virtualizer-missing-item-key` now flags TanStack virtualizer
  options passed to `createVirtualizer` or `.setOptions` without durable
  `getItemKey`; `vaultman/trailing-debounce-explorer-refresh` now flags
  `debounce(...)` and raw `setTimeout(...)` explorer index refresh callbacks
  that should use `leadingDebounce` or an approved scheduler; and
  `vaultman/unbounded-vault-read-promise-all` now flags full-vault
  `Promise.all(files.map(...vault.read/cachedRead...))` shapes outside bounded
  chunk/pool patterns; and `vaultman/unsafe-dynamic-code-path-html` now flags
  direct dynamic code execution, raw dynamic HTML writes, and unguarded dynamic
  vault path calls. The custom query pack is wired into CodeQL analysis and a
  query-test workflow job. Local `codeql test run --additional-packs
  codeql\queries\javascript codeql\tests --threads=0` passed with 4 tests.
- 2026-05-09 durable virtualizer keys DONE:
  [[docs/work/performance/research/2026-05-09-durable-virtualizer-keys|Durable TanStack virtualizer keys]].
  `viewTree`, `ViewNodeGrid`, and `ViewNodeTable` now pass durable
  `getItemKey` functions to TanStack virtualizers. New mounted component guard
  covers the contract; focused view regression, `check`, `lint`, and scoped
  diff-check passed.
- 2026-05-09 NN-4 native Obsidian surface adapter DONE:
  [[docs/work/hardening/plans/2026-05-09-node-notes-nn4-native-surface-adapter/index|Native Obsidian surface adapter]].
  Ctrl/Cmd/Alt/middle clicks on native tag, metadata tag, folder, and
  breadcrumb surfaces now route through `NodeBindingService`; hover previews
  fire through `workspace.trigger("hover-link", ...)` only for unique binding
  note aliases. Focused unit 2 files/28 tests, `check`, `lint`, `build`, and
  Obsidian CLI smoke passed.
- 2026-05-09 ecosystem performance and CodeQL research DONE:
  [[docs/work/performance/research/2026-05-09-ecosystem-performance-codeql-research|Ecosystem performance and CodeQL guardrail research]].
  Key next actions: configure TanStack virtualizer item keys by durable node ID,
  add revision-gated explorer model caches, and add CodeQL structural guardrails
  for debounce regressions, missing virtualizer keys, unbounded vault reads, and
  unsafe dynamic code/path/HTML patterns.
- 2026-05-09 NN-3 PageStats Add-ons note preview DONE:
  [[docs/work/performance/research/2026-05-09-viewtree-latency-test-repair|ViewTree latency and performance-test repair]].
  Statistics left FAB now opens a public `FuzzySuggestModal<TFile>` note
  picker; PageStats renders selected markdown in-frame with
  `MarkdownRenderer.render(...)` and an owned Obsidian `Component`; Show
  PageStats unloads the preview lifecycle and restores stats. Focused unit
  5 files/24 tests, focused component 3 files/9 tests, `lint`, `check`,
  `build`, and integration performance 1 file/2 tests passed.
- 2026-05-09 NN-2 plugins explorer DONE:
  [[docs/work/hardening/plans/2026-05-09-node-notes-nn2-plugins/index|Plugins explorer in pageTools]].
  `pageTools` now exposes a plugins tab backed by `createCommunityPluginsIndex`
  and `explorerPlugins`; external plugin toggles refresh visible rows, Vaultman
  self-disable is guarded, and `plugin.bindingNote` routes to `%pluginId`
  notes. Focused unit 6 files/30 tests, focused component 2 files/6 tests,
  `check`, `lint`, `build`, and `git diff --check` passed.
- 2026-05-09 NN-1 snippets explorer DONE:
  [[docs/work/hardening/plans/2026-05-09-node-notes-nn1-snippets/index|Snippets explorer in pageTools]].
  `pageTools` now exposes a snippets tab backed by `createCSSSnippetsIndex(app)`
  and `explorerSnippets`; snippet enable/disable toggles refresh visible rows,
  and `snippet.bindingNote` routes to `$snippetname` notes. Focused unit
  4 files/22 tests, focused component 1 file/3 tests, `check`, `lint`,
  `build`, and `git diff --check` passed.
- 2026-05-08 backlog cut 1 DONE:
  [[docs/work/hardening/backlog/2026-05-08-backlog-cut-1/index|navigation, queue removal, all-files explorer, and rename extension safety]].
  Focused unit/component tests, `pnpm run lint`, `pnpm run check`, and
  `pnpm run build` pass with 0 lint/check warnings.
- 2026-05-08 backlog cut 2 DONE:
  [[docs/work/hardening/backlog/2026-05-08-backlog-cut-2/index|mouse gestures, PageUp/PageDown reveal, content delete, PNG files, and view/sort click weights]].
  Focused unit/component tests, `pnpm run check`, `pnpm run lint`, and
  `pnpm run build` pass with 0 lint/check warnings.
- 2026-05-08 backlog cut 3 DONE:
  [[docs/work/hardening/backlog/2026-05-08-backlog-cut-3/index|viewtree chevron live click regression]].
  SVG chevron pointerdown no longer starts box-selection capture; focused
  component tests, `check`, `lint`, `build`, and Obsidian CDP smoke passed.
  Follow-up cut 4 is now done.
- 2026-05-08 backlog cut 3b DONE:
  [[docs/work/hardening/backlog/2026-05-08-backlog-cut-3b-service-mouse/index|serviceMouse gesture routing]].
  The chevron patch was generalized into `serviceMouse`: nodes, FABs,
  view/sort controls, grid, and table now route primary/secondary/tertiary
  mouse gestures through one configurable service. Middle mouse can trigger
  tertiary. Focused service unit/component suites, `check`, `lint`, `build`,
  scoped diff-check, and Obsidian CLI smoke are green.
- 2026-05-08 backlog cut 4 DONE:
  [[docs/work/hardening/backlog/2026-05-08-backlog-cut-4-view-size/index|serviceViewSize and stable node sizing]].
  Tree/grid no-icon nodes reserve icon slots, grid presets are centralized in
  `serviceViewSize`, focused tests plus `check`, `lint`, `build`, and scoped
  diff-check are green. The source record now expands the pending cut ladder
  through cut 25.
- 2026-05-08 backlog cut 5 DONE:
  [[docs/work/hardening/backlog/2026-05-08-backlog-cut-5-badge-message/index|generic badge module and serviceMessage]].
  `src/badges/serviceBadge.ts` now owns badge descriptors for hover, active,
  and FAB count badges; `badgeRegistry` is a compatibility shim; tree/grid/FAB
  badge rendering consumes descriptors; `serviceMessage` centralizes one-shot
  system/user messages. Focused unit/component tests, `check`, `lint`, and
  `build` pass. 2026-05-08T10:46 continuation removed accidental pnpm drift and
  fixed the full-unit `splitYamlBody` regression; full unit, check, lint,
  build, and focused badge components pass. Next cut is cut 6 provider/API
  module migration.
- 2026-05-08 cuts 6-9 DONE:
  [[docs/work/hardening/plans/2026-05-08-cuts-6-9-files-open/index|provider/API migration, badge/filter selection ingestion, open toggles, hidden Files explorer, and content search progress]].
  Providers moved to `src/providers` with container shims and
  `src/api/explorerProvider.ts`; open commands toggle; Files explorer hides
  dot-prefixed paths by default with a Settings toggle, builds folder
  ancestors by path, and shows non-md extensions in count slots; hover badges
  receive selected nodes and warn on delete/mutation contradictions; content
  search publishes progress/incremental results.
- Node selection service Phase 1 is present and verified. This continuation
  made one lint-only refactor in `serviceSelection.svelte.ts` after the
  service unit tests were green.
- Tree adapter Phase 2 is implemented in the current worktree:
  `panelExplorer.svelte` consumes `NodeSelectionService`, `viewTree.svelte`
  separates row-slot selection from primary label action, tree rows expose
  `aria-multiselectable` and selection-only `aria-selected`, outside click and
  `Escape` clear active explorer node selection, and tree SCSS uses a full-slot
  hit target with an inner visual surface.
- Added component coverage for view-tree gesture separation and panel-level
  selection service wiring/clear behavior.
- Provider actions Phase 3 is implemented and verified: file delete now uses
  selected file context nodes, provider tests cover selected file/tag/prop/value
  context actions, direct tag/property/value actions, add-mode quick-action
  badges, and provider invalidation callbacks.
- Replaced the three provider `@services/serviceFnR` imports with relative
  imports so Vitest unit resolution matches the local import style.
- Viewgrid Phase 4 is implemented in the current worktree:
  `ViewNodeGrid.svelte` is a generic `TreeNode` grid adapter, panel grid mode
  now uses provider tree nodes and the shared `NodeSelectionService`, and file
  node grid selection still syncs selected files through `filterService`.
- Phase 5 visual accessibility is implemented: tree/grid tests assert
  ARIA/state-class contracts, grid active-node state is explicit, tree/grid
  selected/focused/active styles are distinct, selection-box styling is crisper,
  reduced-motion guards are in SCSS, and `styles.css` was regenerated.
- Phase 6 verification completed for the node-selection/viewgrid plan.
- `styles.css` was regenerated by `pnpm run build` after the tree SCSS changes.
- Focused unit tests pass for `serviceFnR`, `serviceQueue`,
  `explorerTags`, and `explorerFiles`.
- Focused component test passes for `pageFiltersRenameHandoff`.
- A3 focused component tests pass for `navbarPillFabBadges` and
  `viewTreeDecorations`.
- A3 focused unit tests pass for `explorerTags`, `explorerProps`, and
  `utilBadgeBubbling`.
- Bases parser focused unit tests pass for `serviceBasesInterop`,
  `filter-evaluator`, `indexBasesImportTargets`, and `serviceFilter`.
- Node selection focused unit test passes for `serviceSelection`.
- Tree adapter focused component tests pass for `viewTreeSelection`,
  `viewTreeDecorations`, and `panelExplorerSelection`.
- Provider action focused unit tests pass for `explorerFiles`, `explorerTags`,
  and `explorerProps`.
- Viewgrid focused component tests pass for `viewGridSelection`,
  `panelExplorerSelection`, and `panelExplorerEmpty`.
- `pnpm run check`, `pnpm run lint`, and `pnpm run build` pass.
- 2026-05-06 debugging continuation fixed the Obsidian node-selection hang by
  cutting accidental Svelte effect tracking in `panelExplorer.svelte`, making
  `ViewService.subscribe()` real, and migrating tree/grid windowing to
  `@tanstack/svelte-virtual`.
- 2026-05-07 node expansion continuation implemented and verified the tree
  reliability cut, tree `ArrowLeft`/`ArrowRight` semantics, generic sort-view
  expand/collapse-all, and default grid folder navigation.
- 2026-05-07 multifacet-2 phase 1a complete: `FnRIslandService` (11/11 unit
  tests) plus searchbox-mounted FnR island, mode pill, `crear` button (gated
  by `src/registry/explorerAddOps.ts`), toolbar takeover via opacity +
  pointer-events on `.vm-toolbar-takeover`, Esc + outside-click collapse, and
  the legacy rename handoff input relocated INSIDE the searchbox row. New
  tests `test/unit/registry/explorerAddOps.test.ts` (8/8) and
  `test/component/{searchboxIsland,panelExplorerCrear}.test.ts` (5/5) pass.
- 2026-05-07 multifacet-2 phase 1b verified: `tabContent.svelte` already
  collapsed to one `.vm-content-fnr-input` plus mode pill, and
  `navbarExplorer.svelte` already places view/sort right of `crear` inside
  `.vm-toolbar-menu-min`. Existing tests
  `test/component/explorerContentSingleInput.test.ts` (2/2) and
  `test/component/navbarToolbarMenuPlacement.test.ts` (1/1) pass without
  implementation changes; plan shard 01b checkboxes flipped to `[x]`.
- 2026-05-07 multifacet-2 phase 5 DONE: `useDoubleClick` helper +
  `FilterService.clearAll` / `OperationQueueService.{clearAll,processAll}`
  + `FabDef.onDoubleClick` wired in `navbarPillFab.svelte` and
  `framePages.ts`. New `serviceCommands.ts` registers 7 `vaultman:*`
  commands with `checkCallback` greying; `vaultman:open` calls
  `panelExplorer.focusFirstNode()` (3-frame rAF retry). Tests:
  `serviceCommandsRegistration` 6/6 + `navbarPill/QueueDoubleClickClear`
  4/4. lint 0/0, build green, `git diff --check` exit 0. CLI smoke
  deferred per spec.
- 2026-05-07 multifacet-2 phase 6 DONE: independent workspace
  leaves with plugin-data persistence. New
  `src/registry/tabRegistry.ts` (TabId, DETACHABLE,
  `viewTypeFor`, inner↔canonical translation). New
  `src/services/serviceLeafDetach.ts` (load/save via plugin
  data key `independentLeaves`, `detach`/`attach` wrapped in
  `PerfMeter.timeAsync('leaf:detach:<id>'/'leaf:attach:<id>')`,
  idempotent `restore()` deferred to `onLayoutReady`).
  Generic `VaultmanTabLeafView` (`src/types/typeTabLeaf.ts`)
  registered up-front for every TabId. `main.ts` wires the
  service, registers all view-types, and calls
  `restore()` after Obsidian's workspace replay. New
  components `tabViewMenuDetach.svelte` (label flips
  detach↔attach) and `settingsLeafToggle.svelte` (global
  all-tabs toggle) both consume `LeafDetachService`. i18n
  keys `viewmenu.detach_to_leaf`, `viewmenu.return_to_panel`,
  `settings.leaf_toggle.all_independent` added (en+es).
  `independentLeaves: Record<string, boolean>` field added
  to `typeSettings.ts` (default `{}`). Tests: unit 8/8
  (`serviceLeafDetach.test.ts`), component 6/6
  (`tabViewMenuDetach` 3 + `settingsLeafToggle` 3).
  Phase 4 regression `perfMeter.test.ts` + `serviceOpsLog.test.ts`
  green (13/13). lint 0/0, build green, scoped
  `git diff --check` exit 0. Plan shard 06 checkboxes flipped.
  Smoke test deferred per spec. No private-API monkey-patch.
- 2026-05-07 multifacet-2 phase 4 DONE: delete-conflict modal +
  ops-log tab + `PerfMeter`. New `src/services/perfMeter.ts`,
  `src/services/serviceOpsLog.svelte.ts` (ring buffer, default
  cap 1000, configurable via `opsLogRetention` setting),
  `src/components/modals/modalDeleteConflict.svelte`,
  `src/components/pages/pageToolsOpsLog.svelte` (new `ops_log`
  tab in `pageTools`). Queue gained
  `bindOpToNode`/`listOpsForNode`/`dropForNode(nodeId,kinds)` plus
  async `requestDelete({ nodeId, nodeLabel, enqueueDelete })`
  (fails closed when no modal opener registered).
  `panelExplorer.svelte` routes hover-delete through
  `requestDelete` and forwards other kinds via new
  `ExplorerProvider.handleHoverBadge` opt-in. `main.ts` emits
  `vaultman:boot:{start,end}` marks, diffs `app.plugins.plugins`
  before/after for `plugin:loaded:<id>` (records
  `plugin:loaded:not-measurable` when diff empty), wraps each
  `serviceCommands.ts` callback in `PerfMeter.timeAsync`, and
  times `serviceFilter.computeFiltered` + `FnRIslandService.submit`.
  i18n keys added in en/es. Tests: 19/19 new unit
  (`serviceQueueDeletePurge` 6, `perfMeter` 6, `serviceOpsLog` 7)
  + 11/11 new component (`modalDeleteConflict` 4,
  `panelExplorerDeleteConflict` 2, `pageToolsOpsLog` 5).
  Regression `badgeRegistry` 12/12 +
  `panelExplorerBadgeCollision` 4/4 green. lint 0/0, build green,
  `git diff --check` clean. Plan shard 04 checkboxes flipped.
  Pre-existing `serviceQueue.test.ts` import error unrelated to
  this phase (references missing `serviceFnR.svelte` path).

- 2026-05-07 multifacet-2 phase 8 DONE (wave 2 complete): Settings UI
  surfaces `bindingNoteFolder` (with TFolder existence Notice
  validation), `opsLogRetention` (numeric input clamped 100–10000),
  `fnrRegexDefault` (Toggle), and the existing `settingsLeafToggle`
  for `independentLeaves`. `FnRIslandService` constructor accepts
  `initialFlags`; `pageFilters.svelte` seeds `regex` from
  `plugin.settings.fnrRegexDefault`. `typeSettings.ts` gained
  `fnrRegexDefault?: boolean` (default `false`). i18n keys added in
  en+es: `settings.binding_note_folder.invalid`,
  `settings.ops_log_retention(.desc)`,
  `settings.fnr_regex_default(.desc)`. SCSS + reduced-motion guards
  audited — no consolidation required, guards intact. `styles.css`
  regenerated. Final verification: focused unit 13/13 files
  (126 tests), focused component 17/17 files (53 tests), regression
  baseline 6/7 green (pageFiltersRenameHandoff keeps documented
  pre-existing 1 failure). `pnpm exec vp build` 107 kB CSS / 410 kB
  JS (gzip 15.4 / 122 kB). `pnpm exec vp lint` 0/0. Obsidian CLI
  smoke: plugin reload clean, `dev:errors` "No errors captured.",
  `vaultman:open` executed cleanly. Multifacet wave 2 DONE.

- 2026-05-07 multifacet-2 phase 7 DONE: `src/services/serviceNodeBinding.ts`
  with `bindOrCreate(node)` resolves the 0/1/N alias-match flow
  per spec. New op kind `append_links` + sentinel `APPEND_LINKS`
  plumbed through `typeOps.ts`, `OperationQueueService` (idempotent
  — skips links already in body), and `buildAppendLinksChange`.
  `serviceFnRPropSet.ts` exposes `prefillPropSetIsland` /
  `parsePropSetSubmission` / `buildPropSetChange`; `FnRIslandMode`
  gains `add-prop`. New cmenu entries: `tag.set` +
  `tag.bindingNote` on `explorerTags`; `prop.set` +
  `prop.bindingNote` + `value.set` + `value.bindingNote` on
  `explorerProps`; `file.set` on `explorerFiles`.
  `bindingNoteFolder?: string` appended to `VaultmanSettings`
  (default `''`) alongside phase 6's `independentLeaves`.
  `main.ts` constructs `nodeBindingService` with a router that
  adds an `aliases` rule via `filterService.addNode`. Tests:
  17/17 unit (`serviceNodeBinding` 12, `serviceFnRPropSet` 5);
  8/8 component (`cmenuSetAction` 4, `cmenuCreateBindingNote` 4).
  Regression `serviceFnRIsland` 11/11, `explorerAddOps` 8/8,
  `serviceQueueDeletePurge` 6/6 green. lint 0/0, build green
  (407 kB / gzip 121 kB), scoped `git diff --check` exit 0. Plan
  shard 07 checkboxes flipped. Settings UI exposure deferred
  (no UI exists yet for sibling phase 4-6 settings either).

- 2026-05-07 multifacet-2 phase 3 DONE: `src/services/badgeRegistry.ts`
  exports `BadgeKind`, `ORDER`, `visibleHoverBadges`, `activeBadges`,
  plus `badgeKindFromOpKind` / `badgeKindFromNodeBadge` helpers. Hover
  render is opt-in (views render hover badges only when
  `activeOpsByNode` is provided) so existing `viewTreeDecorations`
  regression test stays green without edits. `viewTree.svelte` and
  `ViewNodeGrid.svelte` consume the registry; new `is-hover-badge`
  styles live in `src/styles/components/_badges.scss` scoped via
  `.is-hover-badge` (faint icon-only, active = text+icon). Hover-zone
  visibility is gated on row/tile `:hover` / `:focus-within` in
  `_virtual-list.scss` and `_grid.scss`. `panelExplorer.svelte`
  subscribes to `queueService.on('changed')`, increments a
  `queueVersion` counter, and rebuilds `activeOpsByNode` via
  `$derived.by` keyed on that counter (no render loop). Tests:
  `badgeRegistry` 12/12, `viewTreeHoverBadges` 4/4,
  `viewGridHoverBadges` 3/3, `panelExplorerBadgeCollision` 4/4.
  Regression: `viewTreeDecorations` 6/6, `panelExplorerSelection` 6/6,
  `navbarPillFabBadges` green. lint 0/0, build green, scoped
  `git diff --check` exit 0.
- 2026-05-07 multifacet-2 phase 2 complete: tests backfilled for the
  pre-existing `serviceFnRTemplate.ts` and `serviceFnRDateParser.ts`
  (TDD violation in prior subagent's run). Three new unit suites pass
  (`serviceFnRTemplate` 20, `serviceFnRDateParser` 12,
  `serviceFnRTokenAllowlist` 6 → 38 net new) plus the existing
  `serviceFnRIsland` 11 and `explorerAddOps` 8 stay green (64/64
  required unit total). Searchbox island now exposes `Aa` / `W` / `.*`
  flag toggles wired to `FnRIslandService.setFlag` with mutual
  exclusion (regex ON disables wholeWord), and an inline
  `vm-filters-search-error` block surfaces token / regex validation
  errors above the pill. `crear` auto-disables while errors exist.
  New `test/component/searchboxIslandFlags.test.ts` (5 tests) plus
  the four other component suites pass (13/13 component required).
  `pnpm exec vp build` and `pnpm exec vp lint` green; scoped
  `git diff --check` exit 0. Stub tokens (EXIF, ID3, doc, checksum)
  resolve to empty + warn until external parsers ship; every other
  token in the spec resolves.
- Inline grid expansion is now enabled: Settings persists
  `gridHierarchyMode: 'inline'`, parent grid tiles show chevrons, collapsed
  children stay hidden, expanded parents render nested child grids, and
  rectangle selection includes expanded child tiles.
- Inline completion verification passed scoped component tests for
  `viewGridSelection`, `panelExplorerSelection`, and `settingsUI` with 36 tests;
  `pnpm run check`, `pnpm run lint`, `pnpm run build`, scoped
  `git diff --check`, and Obsidian CLI reload/open plus `dev:errors` passed.
  Build hit the known transient `svelte` resolver once, then passed on immediate
  sequential rerun without code changes.
- TanStack node table MVP is implemented in the current worktree: table-core
  adapter, `ViewNodeTable.svelte`, panel table routing, table SCSS, view-mode
  popup Table route, and focused unit/component checks are green; broad
  `check`, `lint`, and `build` pass. Obsidian CLI smoke renders table mode,
  selection, and sorting with clean runtime/console error checks.
- Provider-specific table columns are implemented for `props`, `tags`, `files`,
  and `content`. Focused adapter/component tests pass, and Obsidian CLI smoke
  verified the live props table shows `Name / Kind / Type / Count` with
  `Property` and `Value` row cells and clean error/console checks.
- Final Obsidian CLI smoke after the TanStack build selected a tree row and a
  grid tile without hanging; `dev:errors` was clean after log analysis.
- Lint cleanup resolved the previous three warning residuals in
  `.agents/tools/pkm-ai/analyze-code.mjs`, `vitest.config.ts`, and
  `test/unit/services/serviceQueueRace.test.ts`; latest `pnpm run lint`
  reports 0 warnings and 0 errors.
- Phase 6 hit the known transient `svelte` resolver issue once on an individual
  component test, then passed on immediate sequential rerun.
- Combined component and Vite/Svelte runs can still hit the known transient
  resolver issue; avoid running Vite/Svelte verification commands in parallel.

## Source Links

- [[docs/current/handoff|current handoff]]
- [[docs/current/engineering-context|engineering context]]
- [[docs/work/pkm-ai/items/vm-0002-current-docs-as-route-indexes|current docs as route indexes]]
- [[docs/work/hardening/specs/2026-05-06-node-selection-service/index|Node selection service and viewgrid spec]]
- [[docs/work/hardening/plans/2026-05-06-node-selection-service/index|Node selection service plan]]
- [[docs/work/hardening/plans/2026-05-07-node-expansion-keyboard-grid/index|Node expansion, keyboard navigation, and hierarchical grid plan]]
- [[docs/work/hardening/research/2026-05-06-selection-tanstack-virtualizer-debug/index|Selection hang and TanStack virtualizer assimilation]]
- [[docs/work/hardening/specs/2026-05-05-bases-interop-slice-1/index|Bases interop slice 1]]
- [[docs/work/hardening/plans/2026-05-06-cmenu-queue-repair/index|CMenu queue repair plan]]
- [[docs/work/hardening/plans/2026-05-06-prop-value-rename-handoff/index|prop/value rename handoff plan]]
- [[docs/work/hardening/research/2026-05-05-bases-interop-research/index|Bases interop research]]
- [[docs/work/polish/specs/2026-05-07-tanstack-node-table/index|TanStack node table]]
- [[docs/work/polish/plans/2026-05-07-tanstack-node-table/index|TanStack node table implementation plan]]

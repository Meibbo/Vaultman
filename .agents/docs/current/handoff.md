---
title: Current handoff
type: agent-handoff
status: active
parent: "[[docs/work/hardening/specs/2026-05-06-node-selection-service/index|node-selection-service]]"
archive_source: "docs/archive/hardening/active-docs/2026-05-06T050935-current-handoff.md"
compacted: true
created: 2026-05-04T01:36:20
updated: 2026-05-09T21:54:00
tags:
  - agent/current
created_by: dec
updated_by: codex
---

# Current Handoff

Archived completed/superseded handoff:
[[docs/archive/hardening/active-docs/2026-05-06T050935-current-handoff|2026-05-06 current handoff archive]].

## Where To Resume

- Latest completed performance slice:
  [[docs/work/performance/plans/2026-05-09-revision-gated-explorer-model-caches|Revision-gated explorer model caches]].
  `INodeIndex` and `contentIndex` now publish revisions; explorer providers
  pass source/queue/filter revisions into `ViewService`; semantic row layers
  are cached behind revision keys while transient selection state is recomputed
  per model request. Continuation added perf-probe counters for
  `viewService.semanticCache.hit`, `.miss`, and `.evict`. Latest verification
  passed: `lint`, `check`, `build`, and `test:unit`.
- Previous completed performance slice:
  [[docs/work/performance/plans/2026-05-09-codeql-guardrails|CodeQL performance guardrails]].
  The `virtualizer-missing-item-key`,
  `trailing-debounce-explorer-refresh`, and
  `unbounded-vault-read-promise-all` query pack slices are done and wired into
  CodeQL analysis plus a custom query-test job.
- Earlier completed performance slice:
  [[docs/work/performance/research/2026-05-09-durable-virtualizer-keys|Durable TanStack virtualizer keys]].
- Latest performance research:
  [[docs/work/performance/research/2026-05-09-ecosystem-performance-codeql-research|Ecosystem performance and CodeQL guardrail research]].
  Best first implementation slice is durable `getItemKey` on `viewTree` /
  grid / table virtualizers, followed by revision-gated explorer model caches
  and a CodeQL query pack for structural performance/security guardrails.
- Latest next implementation lane:
  [[docs/work/hardening/backlog/2026-05-09-node-notes-next-priority/index|Node notes next-priority implementation order]].
  NN-0 contract correction, NN-1 snippets explorer, NN-2 plugins explorer, and
  NN-3 PageStats Add-ons note preview are done. NN-4 native Obsidian DOM
  adapter is also done with live smoke. NN-5 harness spike is not needed unless
  a future native-surface regression exposes a harness gap; resume backlog cut
  10 or the next user-selected polish cut.
- Continue [[docs/work/hardening/specs/2026-05-06-node-selection-service/index|Node selection service and viewgrid spec]] and
  [[docs/work/hardening/plans/2026-05-06-node-selection-service/index|Node selection service implementation plan]].
- Latest user-requested plan:
  [[docs/work/hardening/plans/2026-05-07-node-expansion-keyboard-grid/index|Node expansion, keyboard navigation, and hierarchical grid plan]].
- Latest continuation:
  [[docs/work/hardening/research/2026-05-06-selection-tanstack-virtualizer-debug/index|Selection hang and TanStack virtualizer assimilation]].
- Current polish continuation:
  [[docs/work/polish/specs/2026-05-07-tanstack-node-table/index|TanStack node table spec]] and
  [[docs/work/polish/plans/2026-05-07-tanstack-node-table/index|TanStack node table plan]].
- Read [[docs/current/engineering-context|engineering context]] with this file
  and status; `start.md` now links it explicitly.
- User explicitly said to ignore the no-commit rule and active-doc compactness
  rule for this task.
- Current docs policy now says active-work detail goes in initiative source
  records, while status/handoff keep compact wikilinks:
  [[docs/work/pkm-ai/items/vm-0002-current-docs-as-route-indexes|current docs as route indexes]].
- 2026-05-08 backlog cut 1 is done:
  [[docs/work/hardening/backlog/2026-05-08-backlog-cut-1/index|navigation, queue removal, all-files explorer, and rename extension safety]].
  Remaining backlog starts with mouse click behavior, multi-selected badge ops,
  contradiction warnings, filter ingestion, and tabcontent search UX.
- 2026-05-08 backlog cut 2 is done:
  [[docs/work/hardening/backlog/2026-05-08-backlog-cut-2/index|mouse gestures, PageUp/PageDown reveal, content delete, PNG files, and view/sort click weights]].
  Focused unit/component tests, `check`, `lint`, and `build` passed.
- 2026-05-08 backlog cut 3 is done:
  [[docs/work/hardening/backlog/2026-05-08-backlog-cut-3/index|viewtree chevron live click regression]].
  Root cause was SVG `pointerdown` from Obsidian `setIcon` bypassing the
  `HTMLElement` guard and starting box-selection capture. Fix changed the
  guard to accept any `Element`. Focused component tests, `check`, `lint`,
  `build`, and Obsidian CDP smoke passed. Follow-up cut 4 is now done.
- 2026-05-08 backlog cut 3b is done:
  [[docs/work/hardening/backlog/2026-05-08-backlog-cut-3b-service-mouse/index|serviceMouse gesture routing]].
  This supersedes the chevron-only conclusion with a generic mouse grammar:
  `serviceMouse` resolves primary/secondary/tertiary gestures for nodes,
  FABs, view/sort controls, grid, and table; middle mouse is a tertiary
  binding; `VaultmanSettings.mouseGestures` carries per-surface config.
  Focused service unit and component suites, `check`, `lint`, `build`, scoped
  diff-check, and Obsidian CLI smoke are green.
- 2026-05-08 backlog cut 4 is done:
  [[docs/work/hardening/backlog/2026-05-08-backlog-cut-4-view-size/index|serviceViewSize and stable node sizing]].
  Tree/grid no-icon nodes reserve icon slots, grid presets are centralized in
  `serviceViewSize`, and focused tests plus `check`, `lint`, `build`, scoped
  diff-check are green. The source record now expands the cut ladder through
  cut 25.
- 2026-05-08 backlog cut 5 is done:
  [[docs/work/hardening/backlog/2026-05-08-backlog-cut-5-badge-message/index|generic badge module and serviceMessage]].
  New `src/badges/serviceBadge.ts` centralizes badge vocabulary, labels, icons,
  ordering, hover descriptors, FAB count descriptors, and contradiction
  detection. `src/services/badgeRegistry.ts` remains as a compatibility shim.
  `serviceMessage` centralizes one-shot info/success/warning/error messages.
  2026-05-08T10:46 continuation removed accidental pnpm drift and fixed the
  full-unit `splitYamlBody` regression. Full unit, check, lint, build, and
  focused badge component tests pass. Provider/API migration was intentionally
  not done; resume with cut 6.
- 2026-05-08 cuts 6-9 are done:
  [[docs/work/hardening/plans/2026-05-08-cuts-6-9-files-open/index|cuts 6-9 implementation plan/result]].
  Preserve new `src/providers/*` concrete providers plus compatibility shims
  under `src/components/containers/*`, `src/api/explorerProvider.ts`, open
  command toggle behavior, `explorerFilesShowHidden`, path-based folder tree
  construction, non-md extension count labels, selected-node hover badge
  scopes, contradiction warnings, and incremental content search status.
- Phase 1 selection service is present and verified. Phase 2 tree adapter is
  implemented and verified in the current worktree.
- Phase 3 provider actions is implemented and verified.
- Phase 4 viewgrid is implemented and verified in the current worktree.
- Phase 5 visual accessibility and Phase 6 verification are implemented and
  verified in the current worktree.
- Next recommended slice: resume parser compatibility work superseded by node
  selection/viewgrid, choose the next post-MVP table capability, or do a visual
  polish pass on inline grid expansion.
- Multifacet wave 2 phase 1a — DONE. UI integration shipped: searchbox
  hosts the mode pill, the rename island input, and the new `crear`
  button. `pageFilters.svelte` instantiates a single panel-scoped
  `FnRIslandService`, syncs `activeExplorer` to `filtersActiveTab`, and
  routes `onCrear(change)` straight into `OperationQueueService.add(...)`.
  `src/registry/explorerAddOps.ts` returns builders for `tag`/`prop` and
  `null` for `file`/`value`/`content` so the button auto-disables with
  the `no soportado por este explorer` tooltip on unsupported tabs. CSS
  takeover lives in `src/styles/explorer/_explorer.scss` under
  `.vm-toolbar-takeover` using opacity + pointer-events to keep the
  TanStack virtualizer measure passes valid. `styles.css` regenerated.
  Phase 1b (`tabContent.svelte` collapse + view/sort right-side
  relocation) tracked at
  [[docs/work/hardening/plans/2026-05-07-multifacet-2/01b-toolbar-takeover-and-tabcontent-collapse|01b shard]] —
  now verified DONE (2/2 + 1/1 component tests pass on the existing
  implementation).
- Multifacet wave 2 phase 6 — DONE. Independent workspace leaves
  with plugin-data persistence. `src/registry/tabRegistry.ts`
  (canonical `TabId`, `DETACHABLE`, `VIEW_TYPE_PREFIX`, inner↔canonical
  translation maps); `src/services/serviceLeafDetach.ts` (load/save
  via `loadData`/`saveData` under key `independentLeaves`, async
  `detach`/`attach`/`restore`, both write paths wrapped in
  `PerfMeter.timeAsync('leaf:<op>:<tabId>')`, restore is idempotent
  and deferred to `onLayoutReady` to avoid racing Obsidian's
  workspace replay). Generic `VaultmanTabLeafView`
  (`src/types/typeTabLeaf.ts`) registered up-front per TabId in
  `main.ts onload`; `spawnTabLeaf`/`closeTabLeaf` use only public
  workspace APIs (`getLeaf('tab')`, `setViewState`, `revealLeaf`,
  `leaf.detach`). View-menu detach entry (`tabViewMenuDetach.svelte`)
  flips between "Detach to leaf" / "Return to panel" labels.
  Settings global toggle (`settingsLeafToggle.svelte`) iterates
  `ALL_TAB_IDS` to detach/attach every tab. i18n keys added in
  en + es. `typeSettings.ts` gained `independentLeaves?` field
  with default `{}` (alongside phase 7's `bindingNoteFolder`).
  Tests: unit 8/8 (`test/unit/services/serviceLeafDetach.test.ts`)
  + component 6/6 (`test/component/tabViewMenuDetach.test.ts`,
  `test/component/settingsLeafToggle.test.ts`). Phase 4 regression
  green (13/13). lint 0/0, build green, scoped
  `git diff --check` exit 0. CLI smoke deferred per spec.
- Multifacet wave 2 phase 8 — DONE. Wave 2 complete. Settings UI
  exposes `bindingNoteFolder` (TFolder existence validation via
  `Notice`), `opsLogRetention` (numeric, clamped 100–10000),
  `fnrRegexDefault` (Toggle) plus existing `settingsLeafToggle` for
  `independentLeaves`. `FnRIslandService` constructor seeds
  `initialFlags`, wired from `plugin.settings.fnrRegexDefault` in
  `pageFilters.svelte`. `typeSettings.ts` adds `fnrRegexDefault?:
  boolean` (default `false`). i18n en+es keys added. SCSS audit
  clean — no consolidation, reduced-motion guards intact.
  Verification: unit 13/13 files (126 tests), component 17/17 files
  (53 tests), regression 6/7 (pageFiltersRenameHandoff retains its
  documented 1-test pre-existing failure; `serviceQueue.test.ts`
  retains its stale-import error). Build 107 kB CSS / 410 kB JS
  (gzip 15.4 / 122 kB). Lint 0/0. Obsidian CLI smoke clean
  (`plugin:reload`, `dev:errors`, `command id=vaultman:open`).

- Multifacet wave 2 phase 7 — DONE. Binding notes + explorer-wide
  `set` action. `src/services/serviceNodeBinding.ts` resolves
  0/1/N alias matches per node kind (prop → `[name]`, tag →
  `#name`, others → label==filename). 0 → create new note in
  `bindingNoteFolder` with `aliases: [token]` and open; 1 → open
  existing; N → route to filter pane via
  `filterService.addNode({ filterType: 'specific_value', property:
  'aliases', values: [token] })` and surface a `Notice`. New
  `serviceFnRPropSet.ts` (`prefillPropSetIsland`,
  `parsePropSetSubmission`, `buildPropSetChange`). `FnRIslandMode`
  gains `add-prop`. New op kind `append_links` (sentinel
  `APPEND_LINKS`) — idempotent on re-runs. cmenu adds:
  `tag.set` + `tag.bindingNote`; `prop.set` + `prop.bindingNote` +
  `value.set` + `value.bindingNote`; `file.set` (append link).
  `bindingNoteFolder?: string` appended to `VaultmanSettings`.
  `nodeBindingService` wired in `main.ts`. Tests: 17 unit
  (`serviceNodeBinding` 12, `serviceFnRPropSet` 5) + 8 component
  (`cmenuSetAction` 4, `cmenuCreateBindingNote` 4) pass.
  Regression `serviceFnRIsland`, `explorerAddOps`,
  `serviceQueueDeletePurge` green. lint 0/0, build green, scoped
  `git diff --check` exit 0. Plan shard 07 flipped. Settings UI
  exposure deferred (none of phase 4-6 settings have UI either).

- Multifacet wave 2 phase 4 — DONE. Delete-conflict modal +
  ops-log tab + `PerfMeter`. Queue exposes
  `bindOpToNode`/`dropForNode`/`requestDelete` (modal opener
  injectable via `deleteConflictModalOpener`).
  `panelExplorer.svelte` routes hover-delete through
  `requestDelete` and forwards other kinds via new
  `ExplorerProvider.handleHoverBadge` opt-in. New service
  `OpsLogService` (ring buffer, default cap 1000, `opsLogRetention`
  setting) bound to `PerfMeter` + `queueService.changed`.
  `main.ts` emits `vaultman:boot:{start,end}` marks and diffs
  `app.plugins.plugins` across boot for per-plugin records.
  Commands wrapped via `PerfMeter.timeAsync('command:<id>')`,
  filter eval + FnR submit timed. `pageTools` shows the new
  `ops_log` tab via `pageToolsOpsLog.svelte`. Tests 19 unit + 11
  component all green; regression badge tests green; lint 0/0,
  build green. Plan shard 04 checkboxes flipped. Ready for
  cut 3 (phases 6+7+8). Pre-existing `serviceQueue.test.ts`
  import error (`serviceFnR.svelte` missing path) unrelated.

- Multifacet wave 2 phase 3 — DONE. New `src/services/badgeRegistry.ts`
  primitive: `BadgeKind` (`set`/`rename`/`convert`/`delete`/`filter`),
  fixed `ORDER`, `visibleHoverBadges` (excludes `convert`, hides
  duplicates, returns `['filter']` only when `delete` is queued),
  `activeBadges` (queue-popup ordering, preserves `convert`), plus
  `badgeKindFromOpKind` / `badgeKindFromNodeBadge` helpers.
  `viewTree.svelte` and `ViewNodeGrid.svelte` consume the registry as
  an opt-in via a new `activeOpsByNode` prop and emit
  `is-hover-badge` icons (data-hover-kind, role=button) wired to a
  new `onHoverBadgeAction(id, kind, e)` callback.
  `panelExplorer.svelte` derives `activeOpsByNode` via a
  `queueVersion`-keyed `$derived.by` and forwards it to both views.
  CSS scoped to `.is-hover-badge` in
  `src/styles/components/_badges.scss` (faint icon-only, active
  state restores text+icon); row/tile hover-zone visibility lives in
  `_virtual-list.scss` + `_grid.scss`. Existing `.vm-badge`
  queue-popup styles are untouched. Tests:
  `test/unit/services/badgeRegistry.test.ts` 12/12,
  `test/component/{viewTreeHoverBadges,viewGridHoverBadges,panelExplorerBadgeCollision}.test.ts`
  4+3+4 = 11/11. Regression suites green:
  `viewTreeDecorations`, `panelExplorerSelection`,
  `navbarPillFabBadges`. Plan shard 03 checkboxes flipped to `[x]`.
  Ready for phase 4.
- Multifacet wave 2 phase 5 — DONE. `useDoubleClick` helper +
  `clearAll`/`processAll` queue/filter aliases + `FabDef.onDoubleClick`
  wired via `navbarPillFab.svelte` (single click toggles popup, double
  click within 250 ms clears). `framePages.ts` binds the gestures to
  `queueService.clearAll` / `filterService.clearAll`. New
  `serviceCommands.ts` registers 7 `vaultman:*` commands; `vaultman:open`
  calls `panelExplorer.focusFirstNode()` (3-frame rAF retry). Plugin
  exposes `activeFnRIslandService` (set by `pageFilters.svelte`) and
  `activePanelExplorerApi` (set by `panelExplorer.svelte`). Legacy
  `apply-queue` retained.
- Multifacet wave 2 phase 2 — DONE. Backfilled the missing TDD tests
  for the previous subagent's `serviceFnRTemplate.ts` /
  `serviceFnRDateParser.ts`. Added searchbox modifier toggles
  (`matchCase`, `wholeWord`, `regex (JS)`) inside the FnR island
  root with mutual exclusion in `FnRIslandService.setFlag`, and an
  inline `vm-filters-search-error` block above the pill that
  surfaces unknown-token and regex-compile errors. `crear` is
  disabled whenever validation reports errors. Stub tokens
  (`exif`/`id3`/`doc`/`checksum`) resolve to `''` and emit
  `logger.warn` until the dedicated parsers ship; every other spec
  token (`base`, `filter`, `date`, `counter`, `name`, `ext`,
  `parent`, `path`, `ctime`, `mtime`, `size`) resolves end-to-end.
  No `eval`, `new Function`, dynamic `import()`, or `require()` in
  the templating or date-parser sources (asserted in tests). Plan
  shards 02 and 01b checkboxes flipped to `[x]`. Ready for phase 3
  (hover badges and ops-log).
- New initiative drafted (no code yet): multifacet wave 2 — see
  [[docs/work/hardening/specs/2026-05-07-multifacet-2/index|spec]] and
  [[docs/work/hardening/plans/2026-05-07-multifacet-2/index|plan]]. All
  5 spec shards (01–05) and all 8 plan shards (01–08) drafted. Ant
  Renamer / Advanced Renamer research recorded as the token table in
  spec shard 01. Three open design points resolved 2026-05-07T02:30:00:
  (a) FnR `{{filter}}` recursion concern dropped — out of scope;
  (b) leaf detach persistence target is plugin data, not workspace file;
  (c) ops-log expanded to a perf+queue event log with bounded retention
  and a `PerfMeter` helper.
- A3 navbar badges and quick actions is implemented and verified.
- Bases parser compatibility resumed after wave A; safe file `.contains(...)`
  expressions are now supported.
- Previous next slice was deeper Obsidian/Bases/Dataview parser compatibility;
  latest user request supersedes it with a plan for tree expand/collapse
  diagnosis, tree keyboard left/right behavior, sort-view expand/collapse-all,
  and hierarchical grid navigation.
- Selection hang continuation is implemented: `panelExplorer.svelte` cuts the
  accidental Svelte effect tracking loop with `untrack`, `ViewService.subscribe`
  is real, and tree/grid rendering uses `@tanstack/svelte-virtual`.
- Do not base `viewTable.svelte` on current `viewGrid.svelte`; it is failed
  table debt.
- Do not move AI files into `main`.

## Fresh Changes To Preserve

- 2026-05-09 NN-4 native Obsidian surface adapter changes to preserve:
  [[docs/work/hardening/plans/2026-05-09-node-notes-nn4-native-surface-adapter/index|NN-4 native surface adapter plan/result]].
  `NativeSurfaceBindingService` registers `vaultman-native-surface`, captures
  Ctrl/Cmd/Alt/middle clicks on native tags, metadata tag pills, folders, and
  breadcrumbs, routes them through `NodeBindingService`, and triggers
  `hover-link` previews only for unique binding aliases. Verification: focused
  unit 2 files/28 tests, `check`, `lint`, `build`, and Obsidian CLI smoke
  passed.

- 2026-05-09 NN-3 PageStats Add-ons note preview changes to preserve:
  [[docs/work/performance/research/2026-05-09-viewtree-latency-test-repair|ViewTree latency and performance-test repair]].
  Statistics left FAB switches between `Open note` and `Show PageStats`;
  `openVaultmanFileSuggestModal` uses public `FuzzySuggestModal<TFile>`;
  `pageStats.svelte` renders selected markdown through
  `MarkdownRenderer.render(app, markdown, host, file.path, component)` with an
  owned Obsidian `Component` lifecycle and unload coverage. Verification:
  focused unit 5 files/24 tests, focused component 3 files/9 tests, `lint`,
  `check`, `build`, and integration performance 1 file/2 tests passed.

- 2026-05-09 NN-2 plugins explorer changes to preserve:
  [[docs/work/hardening/plans/2026-05-09-node-notes-nn2-plugins/index|NN-2 plugins explorer plan/result]].
  `createCommunityPluginsIndex(app)` reads community plugin manifests and state,
  `explorerPlugins` renders/toggles plugins and refuses to disable Vaultman
  itself, `tabPlugins.svelte` is wired into `pageTools`, and
  `plugin.bindingNote` routes to `%pluginId`. Verification: focused unit
  6 files/30 tests, focused component 2 files/6 tests, `check`, `lint`,
  `build`, and `git diff --check` passed.

- 2026-05-09 NN-1 snippets explorer changes to preserve:
  [[docs/work/hardening/plans/2026-05-09-node-notes-nn1-snippets/index|NN-1 snippets explorer plan/result]].
  `createCSSSnippetsIndex(app)` reads Obsidian custom CSS snippets with adapter
  fallback, `explorerSnippets` renders/toggles snippets and registers
  `snippet.bindingNote`, `pageTools` includes `tabSnippets.svelte`, and
  `PanelExplorer` supports optional provider subscriptions for source-index
  refreshes. Verification: focused unit 4 files/22 tests, focused component
  1 file/3 tests, `check`, `lint`, `build`, and `git diff --check` passed.

- Detailed phase 1-5 fresh-change records (engineering-context, node
  selection spec/plan shards, tree/grid adapter rewrites, provider
  action import-path normalisation, viewgrid generic adapter,
  visual-accessibility SCSS, A1/A2/A3 FnR + badge work, bases parser
  `.contains(...)` support, rename island context inlined into tooltips,
  TanStack/selection-hang continuation, node-expansion + keyboard +
  hierarchical grid continuation) live in their initiative source
  records under
  `docs/work/hardening/{specs,plans,research}/...` and the prior
  archived handoff at
  [[docs/archive/hardening/active-docs/2026-05-06T050935-current-handoff|2026-05-06 archive]].
  Active rule: keep handoff narrative under 200 lines and link to
  source records.
- 2026-05-07 inline grid expansion changes to preserve:
  Settings enables and persists `gridHierarchyMode: 'inline'`, grid parent
  tiles show chevrons, collapsed children stay hidden, expanded parents render
  nested child grids in variable-height virtual rows, and rectangle selection
  includes expanded child tiles.
- 2026-05-07 TanStack node table changes to preserve:
  `@tanstack/table-core` local adapter, `ViewNodeTable.svelte`, table mode in
  `panelExplorer.svelte`, table SCSS, view-menu Table route, provider-specific
  columns for `props`/`tags`/`files`/`content`, adapter tests, component tests,
  and the polish source records under `docs/work/polish/...`.
- 2026-05-07 multifacet-2 phase 1a fresh changes: `FnRIslandService`,
  searchbox-mounted island, mode pill, `crear` button,
  `explorerAddOps` registry, and `.vm-toolbar-takeover` opacity +
  pointer-events styling.
- 2026-05-07 multifacet-2 phase 1b fresh changes verified intact:
  `tabContent.svelte` collapses three FnR rows to one input + pill
  (search ↔ replace), and `navbarExplorer.svelte` mounts view/sort
  inside `.vm-toolbar-menu-min` to the right of `crear`.
- 2026-05-07 multifacet-2 phase 3 fresh changes:
  `src/services/badgeRegistry.ts` (new); `viewTree.svelte` +
  `ViewNodeGrid.svelte` accept `activeOpsByNode` + `onHoverBadgeAction`
  and render `.is-hover-badge` icons in canonical order;
  `panelExplorer.svelte` subscribes to `queueService.on('changed')`,
  bumps a `queueVersion` counter, and exposes `activeOpsByNode` to
  both views via `$derived.by`. New `.is-hover-badge` rules in
  `src/styles/components/_badges.scss`; hover-zone visibility in
  `src/styles/explorer/_virtual-list.scss` and
  `src/styles/data/_grid.scss`. New tests:
  `test/unit/services/badgeRegistry.test.ts`,
  `test/component/{viewTreeHoverBadges,viewGridHoverBadges,panelExplorerBadgeCollision}.test.ts`.
  `styles.css` regenerated.
- 2026-05-07 multifacet-2 phase 2 fresh changes:
  `src/services/serviceFnRTemplate.ts` and
  `src/services/serviceFnRDateParser.ts` exist with no `eval` /
  `Function` / dynamic `import` / `require`. `FnRIslandService`
  exposes `flags` + mutual exclusion (`regex` ⇄ `wholeWord`) and
  `submit()` resolves tokens once with a snapshot context.
  `navbarExplorer.svelte` adds `Aa` / `W` / `.*` flag toggles inside
  the searchbox island root and an inline
  `vm-filters-search-error` block; `crear` is disabled while
  validation reports errors. Stub tokens (`exif`, `id3`, `doc`,
  `checksum`) resolve to empty + warn until external parsers ship.
  New tests: `test/unit/services/serviceFnR{Template,DateParser,
  TokenAllowlist}.test.ts` and
  `test/component/searchboxIslandFlags.test.ts`.

## Verified Commands

- Earlier Phase 1-4 and wave-A verification commands remain in the archived
  handoff and initiative source records linked above.
- 2026-05-06 lint cleanup: `pnpm run lint` reported 0 warnings and 0 errors.
- 2026-05-06 lint cleanup:
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceQueueRace.test.ts`
  passed with 1 file and 2 tests.
- 2026-05-06 lint cleanup:
  `git diff --check -- .agents/tools/pkm-ai/analyze-code.mjs vitest.config.ts test/unit/services/serviceQueueRace.test.ts`
  exited 0.
- Phase 5 red test:
  `pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTreeSelection.test.ts test/component/viewGridSelection.test.ts --fileParallelism=false`
  failed on missing `is-active-node`, then passed after the markup/style change.
- Phase 6:
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceSelection.test.ts`;
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/logic/logicKeyboard.test.ts`;
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/components/explorerFiles.test.ts test/unit/components/explorerTags.test.ts test/unit/components/explorerProps.test.ts`.
- Phase 6 component tests:
  `viewTreeSelection` initially hit the known transient `svelte` resolver issue,
  then passed on rerun; `viewGridSelection`, `viewTreeDecorations`, and
  `panelExplorerEmpty` passed sequentially with `--fileParallelism=false`.
- Phase 6 smoke-harness coverage:
  `pnpm exec vp test run --project component --config vitest.config.ts test/component/panelExplorerSelection.test.ts --fileParallelism=false`
  passed with 1 file and 6 tests.
- Phase 6 broad checks: `pnpm run check`, `pnpm run lint`, and
  `pnpm run build` passed; scoped `git diff --check` for touched Phase 5/6
  files exited 0.
- `pnpm run build` failed once with the known transient `svelte` resolver issue
  from `src/types/typeFrame.ts`, then passed on immediate sequential rerun.
- `git diff --check -- src/services/serviceSelection.svelte.ts src/components/containers/panelExplorer.svelte src/components/views/viewTree.svelte src/styles/explorer/_tree.scss src/styles/explorer/_virtual-list.scss test/component/viewTreeSelection.test.ts test/component/panelExplorerSelection.test.ts`
- 2026-05-06 selection/TanStack continuation: focused component selection
  suite passed with 3 files and 21 tests; focused unit service suite passed
  with 3 files and 36 tests; `pnpm run check`, `pnpm run lint`, and
  `pnpm run build` passed.
- 2026-05-06 selection/TanStack continuation: final Obsidian CLI tree/grid
  smoke passed, and `dev:errors` plus log analysis reported no errors.
- 2026-05-07 multifacet-2 phase 2 verification: required unit suite
  64/64 pass; required component suite 13/13 pass with
  `--fileParallelism=false`; `pnpm exec vp build` and
  `pnpm exec vp lint` green; scoped `git diff --check` exit 0 on
  `navbarExplorer.svelte` plus four new test files.
- 2026-05-07 inline completion red/green: scoped component tests for
  `viewGridSelection`, `panelExplorerSelection`, and `settingsUI` first failed
  on gated inline mode and missing inline renderer behavior, then passed
  together with 36 tests.
- 2026-05-07 inline completion broad checks: `pnpm run check`, `pnpm run lint`,
  and `pnpm run build` passed. Build hit the known transient `svelte` resolver
  issue once from `src/types/typeFrame.ts`, then passed on immediate sequential
  rerun without code changes.
- 2026-05-07 inline completion scoped whitespace:
  `git diff --check -- src/components/views/ViewNodeGrid.svelte src/components/containers/panelExplorer.svelte src/components/settings/SettingsUI.svelte src/styles/data/_grid.scss styles.css test/component/viewGridSelection.test.ts test/component/panelExplorerSelection.test.ts test/component/settingsUI.test.ts`
  exited 0.
- 2026-05-07 inline completion Obsidian CLI smoke: `plugin:reload`,
  `vaultman:open`, temporary `gridHierarchyMode: 'inline'` evaluation, and
  `dev:errors` passed after clearing one unrelated older `notebook-navigator`
  error.
- 2026-05-07 TanStack node table verification: adapter unit tests, table
  component tests, panel/overlay component tests, `pnpm run check`,
  `pnpm run lint`, `pnpm run build`, scoped `git diff --check`, and Obsidian
  CLI table-mode smoke passed in the source worktree records.

## Known Residuals

- Previous lint warnings in `.agents/tools/pkm-ai/analyze-code.mjs`,
  `vitest.config.ts`, and `test/unit/services/serviceQueueRace.test.ts` are
  resolved.
- Full `git diff --check` currently fails on unrelated
  `.agents/tools/pkm-ai/shard-index.mjs` trailing whitespace; parser-slice
  diff check passes when scoped to touched parser files.
- Full doc health still fails on pre-existing active `docs/superpowers` and
  oversized `docs/superpowers/plans/*` files.
- Combined component and Vite/Svelte runs can still hit the known transient
  Svelte resolver issue; run Vite/Svelte verification sequentially. During A3
  verification, `pnpm run build` failed once resolving `svelte` from
  `src/types/typeFrame.ts`, then passed on immediate rerun without code changes.
  Phase 6 saw the same resolver class once on `viewTreeSelection`, then passed
  on immediate rerun.

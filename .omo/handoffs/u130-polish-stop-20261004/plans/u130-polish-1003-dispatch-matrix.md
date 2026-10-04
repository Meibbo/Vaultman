# U130 Polish — Dispatch / Dependency / Ownership / Acceptance Matrix

Sibling shard of `.omo/plans/u130-polish-1003.md` (dispatch revision, 2026-10-04,
Sisyphus, sole-author doc task). Source symbols validated by bounded reads against
target worktree `/data/data/com.termux/files/home/wt/u130-c1-grouping` at
`f0ac41f6` (includes `a317da06`; both descend from verified `1bfcbfbe`, not
`origin/dev`). Spec authority: `vaultman/.agents/docs/work/performance/specs/2026-10-03-u130-polish/`
shards `01`–`13` plus rev3 `08`, `08a`, `08b`.

## 1. Spec-10 audit: withdraw unsupported global serialization

Old `10-ordering-collisions.md` imposed one 10-step total order plus a phantom
external blocker. After source validation:

- **WITHDRAWN — global total order (steps 1–10 as cross-unit dependencies).**
  No source edge requires C-units before B/E (different files, different
  mechanisms: `logicSortMenu`/`servicePluginUpdates` vs `viewTree` hover DOM vs
  `explorerFiles` selection). What is real is documented below as
  same-worktree conflicts (intra-lane sequencing) and semantic merge conflicts
  (reconciliation order), not input dependencies. No new dependencies invented.
- **WITHDRAWN — "G1 … request instance-surfaces relay (plan-D contract, U130-110
  §Handoff) in parallel from step 2" (`13-plan-breakdown.md:31`).**
  `feat/instance-surfaces` merged 2026-08-21 (`c94df911`); no live owner, branch,
  or worktree exists. G1 owns its schema/cascade/relay/catalog prerequisites as
  internal units G1.0–G1.6 (rev3 `08` §1). This is a falsified blocker, not a
  dependency.
- **WITHDRAWN — rev1 `base+offset===level` matcher (`07`, corrected in `12`).**
  Relative identities match by EXACT KEY ONLY (`sets['level:0+1']`); numeric
  scopes match exact numeric keys. Arithmetic collapse is forbidden.
- **RETAINED as true input dependencies:** D1→D2 (snippet substitution needs
  D1 identities; D3 has NO D1 input — `InstanceInfoModal`
  `src/modals/modalInstanceInfo.ts:77-204` is already imported
  `navbarFilters.svelte:39` and instantiated `:3405-3411`, independent of
  setting-page identities); C3 badge feed→C2/C4 (pending-count gate +
  target-version tooltip feed only, not all cache I/O; C1 need NOT precede C3);
  F1→F2/F3/F4 (F1 needs declared identity symbols, NOT E checkbox grammar —
  E occurrence-id prerequisite REMOVED); H1→F-units and H2→F5 (named missing
  inputs, `11`); A1/A2 (done) → G1 menu-surface work; G1 internal staging
  G1.2→G1.3→G1.5→G1.4→G1.6 (G1.0/G1.1 free after lane start; G1.0/G1.1/G1.2
  preparation may run IN PARALLEL with F units — only individual contracts gate
  G1 integration). No C2/C4→C5 and no C5→D dependency is stated (C5's only
  store prerequisite is history-store merge/replace conventions).

## 2. Dependency taxonomy (five kinds, no conflation)

1. **True input dependency** — unit X cannot be built/tested without unit Y's
   output. Serializes across lanes. Listed in §4 per issue.
2. **Same-worktree conflict** — two units mutate the same file/region or DOM
   contract; order them inside ONE lane (B1/B3 before E1/E2 on the shared
   hover/selection DOM; C3 before C2/C4 on the badge feed; D1 before D2).
   C1 is an independent menu-entries unit (no C3 precedence); D3 is an
   independent modal-reachability unit (no D1 input); C5 follows only
   history-store conventions (no C2/C4 input). Not a cross-lane dependency.
3. **Semantic merge conflict** — both lanes touch `navbarFilters.svelte` in
   regions that OVERLAP at the title line: Lane 1 owns the update region
   (~1420-1430, ~4150, ~5025-5045 including the `PLUGIN_UPDATE_TOOLBAR_ACTIONS`
   each-block `:5029-5045`); Lane 2 owns (`:947/987/2658/2858/2895`,
   `:3607-3665`, `:4089-4093`, `:5000-5013`, plus the `:5030`
   `title={toolbarNodeTitle(translate(labelKey))}` line INSIDE Lane 1's
   `:5025-5045` update region). `explorerPlugins.ts` badge-tooltip chain
   (`:379,1208-1217` → `viewTree.ts:2659`) is likewise shared. Landing order
   alone does NOT resolve these — reconciliation requires focused suites +
   `pnpm run check` + `git diff --check` (see §5). No same-line edits beyond
   the declared `:5030` overlap.
4. **Provider capacity** — at most two productive workers, approved models only:
   Muse Spark 1.3 (zen) and Gemini 3.8 Flash (antigravity). A different
   node/worktree does NOT create capacity: one live worker per provider pool,
   serial execution on the single admitted Muse pool.
5. **Exclusive live-QA turns** — one live session at a time against PC Web Lab
   vault `Zenless Zone` (`b0634b35f2c0f604`, `https://pc:3443/?vault=…`, scoped
   `weblab-eval --vault`, never `obsidian-cli`). H1/H2 captures, per-unit paired
   BEFORE/AFTER traces, and final FQ4 each hold the turn alone.

## 3. Worktree ownership (reuse, never create)

| Lane | Worktree (reuse) | Branch state | Lane branch |
|---|---|---|---|
| Lane 1 (C+D) | `/data/data/com.termux/files/home/wt/u130-panel-content` | `fix/u130-panel-content` @ `5b26cd65`, tracked clean, ancestor of `f0ac41f6` | new `fix/u130-polish-lane-1` from `f0ac41f6`; original branch/history preserved (ancestor stays reachable, no reset/delete/force) |
| Lane 2 (B+E+F+G) | `/data/data/com.termux/files/home/wt/u130-row-polish` | `fix/u130-row-polish-1001` @ `6c9d5a84`, tracked clean, ancestor of `f0ac41f6` | new `fix/u130-polish-lane-2` from `f0ac41f6`; original branch/history preserved |
| Reference only | `/data/data/com.termux/files/home/wt/u130-groups-integ-0924` | `integ/u130-groups-0924` @ `1ff00c5a`, ancestor of `f0ac41f6` | NO checkout, NO branch, NO edits — read-only precedent for scope/group policies |
| Forbidden | `/data/data/com.termux/files/home/wt/u130` (canonical) | `release/beta9` @ `1bfcbfbe`, read-only | NEVER disposable, NEVER a lane worktree |
| Integration | `/data/data/com.termux/files/home/wt/u130-c1-grouping` | `fix/u130-polish-update-1002` @ `f0ac41f6` | holds A1/A2 (`a317da06`, `f0ac41f6`); lanes reconcile here in order Lane 1 → Lane 2 |

## 4. Per-issue prerequisite contracts

Format per issue: prerequisite (exact symbol) · writable paths · negative
invariants · red test · targeted command · integration test · live oracle.
Base test command: `pnpm exec vitest run --config vitest.unit.config.mts`.

### A1/A2 — DONE (`a317da06` + `f0ac41f6`). Reference only, no lane work.

Seam: `removeMenuOverride` (`src/logic/logicFilesContextMenu.ts:362`),
`resetToDefaults` (`src/VaultmanSettings.ts:2465`),
`TOOLBAR_MENU_DEFAULT_ORDER` (`src/logic/logicToolbarMenuCatalog.ts:265`),
`readLayout` merge target (`src/logic/logicToolbarMenuProjection.ts:138`).
Lock: `test/unit/menuResetDividers.test.ts` (12 tests).

### B1 (READY, first dispatch) — Lane 2 tree-interaction checkpoint, before E

- Prerequisite: none (live dual-ownership already evidenced:
  `.omo/evidence/u130-polish-1003/implementation/meta-hover-tooltip-before.json`
  shows `nonMinimalDualCount: 6` with `title`+`aria-label` duals).
- Symbols: `viewTree.ts:2556-2562` (`title`+`aria-label` on
  `.vaultman-cell-hover-action`); `navbarFilters.svelte:5005-5006` and update
  toolbar `title={toolbarNodeTitle(translate(labelKey))}` (~5030s);
  guard `toolbarNodeTitle` (`navbarFilters.svelte:4090-4093`).
- Writable: `viewTree.ts` hover-action block; `navbarFilters.svelte` toolbar
  button titles. Frontend contract (loaded `frontend` + `modern-web-guidance`
  skills): no new web API; accessible names are the contract — strip the native
  `title`, never the `aria-label`; no decorative motion added.
- Negative invariants: `aria-label` retained on every stripped element;
  `tooltipsEnabledFor(tab)` gates visuals only, never a11y names; `minimalStyle`
  and `toolbarNodeTitle` behavior unchanged; B2 owners (`aria-label` +
  `setTooltip()`) untouched.
- Red test: extend `test/unit/singleRowTooltip.test.ts` — no element carries
  both `title` and `aria-label` when styled tooltips enabled; option-off keeps
  `aria-label`s. Preserve untracked partial `test/unit/hoverTooltipOwnership.test.ts`
  (208 lines, attribution per plan doc — never committed, clarify from
  timestamps/log evidence) — extend, do not overwrite. Its four reported
  failures are harness initialization errors
  (`this.containerEl.toggleClass is not a function` at `viewTree.ts:419`),
  NOT behavioral RED: Lane 2 must adapt using existing renderer tests and the
  production renderer. No test edits in this preparation task.
- Targeted: `… vitest run --config vitest.unit.config.mts
  test/unit/singleRowTooltip.test.ts test/unit/tooltipReadyBeforeHover.test.ts`.
- Integration: `pnpm run check` (tsc + svelte-check 0/0), `git diff --check`,
  wider tooltip/menu suites green (pre-existing failures recorded, not fixed).
- Live oracle: hover each control class in Zenless Zone → exactly one styled
  tooltip (screenshot); view-option off → no visuals, `aria-label`s retained.

### B2 (BLOCKED) — runtime-proof gate, blocks ONLY B2 code change

Requires either the installed Obsidian `setTooltip` source (pinned 1.13.7)
showing independent listeners, or live DOM with two `.tooltip` nodes for one
hover. Current `viewTree.ts:2672-2682` (`aria-label` + `setTooltip()`, no
`title`) stays as-is until then. Missing-evidence label, not absence.

### B3 (READY, verify-only, first dispatch) — Lane 2 tree-interaction checkpoint, with B1

`viewTree.ts:2597-2603, 2672-2682` already `title`-free. No change unless B2
proves duplication; same red/integration/oracle as B1.

### C1 (LATER-GATED, not first dispatch) — independent menu-entries unit

- Prerequisite: none. C1 does NOT precede C3 and C3 does NOT precede C1
  (different mechanisms: `logicSortMenu` entries vs durable update store).
- Symbols: `NODE_TYPE_MENU_OPTIONS` (`src/logic/logicSortMenu.ts:141-186`) —
  record type `'props' | 'tags' | 'files'` has NO `plugins`/`snippets` keys.
- Writable: `logicSortMenu.ts`; `navbarFilters.svelte:4150`;
  `popupSort.svelte:613`.
- Negative: existing props/tags/files menus behavior byte-identical; entry order
  exactly `all, plugins, snippets, ---, state-on, state-off, updates-available`.
- Red: extend `test/unit/nodeTypeFilters.test.ts`.
- Targeted: `… test/unit/nodeTypeFilters.test.ts test/unit/sortMenuModel.test.ts`.
- Integration: sort/menu suites + `pnpm run check` + `git diff --check`.
- Live oracle: by-type menu shows the 7 entries with divider in Zenless Zone.

### C3 (READY, first dispatch) — Lane 1 update-lifecycle checkpoint (with C2/C4)

- Prerequisite: `OpenedHistoryStore(adapter, root)` precedent
  (`src/services/serviceOpenedHistoryStore.ts:13-140`,
  `src/services/serviceLastOpened.ts:67` root `<configDir>/plugins/<id>`).
  No C1 input.
- Symbols: `PluginUpdatesService` in-memory `snapshot = new Map()`
  (`src/services/servicePluginUpdates.ts:23`) with `snapshot.clear()` on
  failure/offline paths (`:62,67,89,96`); construction hydrates at
  (`main.ts:293` per spec — `new PluginUpdatesService(this.app)`; wire the new
  store hydration here if needed).
- Writable: `servicePluginUpdates.ts` + NEW `src/services/servicePendingUpdatesStore.ts`
  (mirrors history-store API). Home `<configDir>/plugins/vaultman/pending-updates/`
  (`v1.json` + journal batches). Record `{id, pendingVersion, discoveredAt,
  checkId, schema:1}`; corrupt → quarantine `pending-updates.corrupt-<ts>`,
  keep last good. Discovery cache stays SEPARATE from native install authority
  (`managerFor` adapter remains installation authority — cache records are
  discovery hints only); do NOT blindly remove `snapshot.clear()` in
  authority-map failure paths — retain-then-reconcile: newer pending
  supersedes per id; installed==target (or explicit clear) removes record
  (installed>=pending reconciliation).
- Negative: cache records are discovery hints only — never installation
  authority; never inside `settings` exports. No journals/quarantine
  overengineering beyond the approved adapter necessities above.
- Red: NEW store suite mirroring history-store tests (restart rehydrates badges;
  corrupt quarantined; offline retains; installed==target clears; newer wins).
- Targeted: `… test/unit/servicePluginUpdates.test.ts` + new store suite.
- Integration: updates/plugin suites + check + diff-check.
- Live oracle: scoped plugin reload only (loadManifests + enable/disable cycle)
  → badges persist; failed check → badges retained. NEVER restart/reopen Obsidian.

### C2/C4 (READY, first dispatch) — Lane 1 update-lifecycle checkpoint (with C3)

- Prerequisite: C3 badge feed only (pending-count gate + target-version
  tooltip values). NOT all cache I/O; no C1 input.
- Symbols: `PLUGIN_UPDATE_TOOLBAR_ACTIONS`
  (`navbarFilters.svelte:1425-1428`); render gated only by `toolbarNodeVisible`
  (~5025-5045) — NO pending-count gate today.
- Writable: `navbarFilters.svelte` toolbar update region; badge tooltip chain
  `explorerPlugins.ts:379,1208-1217` → `viewTree.ts:2659`.
- Negative: visibility rule must not disturb sibling toolbar actions; badge
  tooltip shows target version from cache, never a guessed version.
- Red: `update_all` hidden at 0 pending / shown at ≥1; tooltip contains target
  version (`test/unit/servicePluginUpdates.test.ts` + toolbar suites).
- Targeted: `… test/unit/servicePluginUpdates.test.ts
  test/unit/toolbarAltMenus.test.ts test/unit/navbarFiltersSource.test.ts`.
- Integration + live oracle: 0 pending → action absent; ≥1 → present with
  versioned tooltip in Zenless Zone.

### C5 (LATER-GATED) — Lane 1, after update-lifecycle checkpoint (history-store conventions only; NO C2/C4 input, no D input)

- Prerequisite: history-store merge/replace conventions only
  (`serviceOpenedHistoryStore.ts`, `logicLastOpened.ts:9-29`).
- Symbols: `SettingsDataPayload` (`src/modals/modalSettingsDataTransfer.ts:10`),
  `build/parseSettingsDataExport` (`:22,:39`), developer page import callback
  (`src/VaultmanSettings.ts:984-1050`), history store
  (`src/services/serviceOpenedHistoryStore.ts`), `LastOpenedRecord =
  Record<path, ts>` + `normalizeLastOpenedRecord`
  (`src/logic/logicLastOpened.ts:9-29`).
- Writable: `modalSettingsDataTransfer.ts` (optional `historySets:
  {lastOpened, batches?}`), import callback, store merge/replace primitives.
- Negative: merge default (newer timestamp wins, rename-aware via
  `withRenamedPath`); replace ONLY after preview (counts + date range) +
  explicit confirm; paths are fixed store filenames — JSON never supplies paths;
  invalid input → error shown, history byte-identical (assert mtime+bytes).
- Red: merge-union / replace-after-confirm / invalid-leaves-identical cases
  (`test/unit/serializeLastOpened.test.ts`,
  `test/unit/lastOpenedPersistence.test.ts` pattern).
- Targeted: `… test/unit/serializeLastOpened.test.ts
  test/unit/lastOpenedPersistence.test.ts test/unit/lastOpened.test.ts`.
- Integration + live oracle: export/import round-trip in Zenless Zone dev page.

### D1 (LATER-GATED) — Lane 1, after update-lifecycle checkpoint (independent files, settings-surface coherence)

- Prerequisite: existing adapter `listPluginSettingPages(app, tabId)` (import
  `logicAddonExplorer.ts:16`, plugin path `:817`).
- Symbols: `buildGlobalSettingsNodes` (`:1255-1300`) builds leaf stubs
  (`showCaret:false, children:[]`); `GLOBAL_SETTINGS_TAB_IDS` (`:1148-1158`,
  9 ids); same page/tree builder + homonym hoisting (`:740-830`).
- Writable: `logicAddonExplorer.ts` (+ `serviceSettingSearchAdapter.ts` ONLY if
  the native query needs the `tabId` term; its `candidate.tab === tabId` filter
  at `:262,266` already matches core tabs when native search returns them).
- Negative: plugin path byte-identical; dedup keys gain tab + provenance
  (same-tab blank/homonym risk only).
- Red: global-tab children non-empty with distinct identity keys
  (`test/unit/logicAddonPluginSettingsChildren.test.ts` +
  `test/unit/settingPageCache.test.ts`).
- Targeted: `… test/unit/logicAddonPluginSettingsChildren.test.ts
  test/unit/settingPageCache.test.ts test/unit/serviceSettingSearchAdapter.test.ts`.
- Integration: `u130ParityA2/Mech`, `u130CanonicalShape` green.
- Live oracle: global settings tabs expand with children in Zenless Zone.

### D2 (LATER-GATED) — Lane 1, after D1 (true input: D1 identities)

- Symbols: snippet provider identity `providerId:'snippets'`
  (`src/components/containers/explorerSnippets.ts:353,757`); NEW explicit
  substitution map (user-confirmable), never bare-name matching.
- Writable: D1 seam + new map; unmatched pages stay setting pages; snippet
  unregister/rename restores the setting page.
- Negative: tab/page homonyms coexist (identity keys `tab::page::pagePath` +
  provenance); no dangling refs.
- Red: homonym / unmatched / unregister-restore cases.
- Targeted: suites above + `test/unit/u130ParityMech.test.ts`.
- Live oracle: substitution visible, reversible in Zenless Zone.

### D3 (LATER-GATED, independent of D1) — Lane 1, after update-lifecycle checkpoint. NO D1 input: reachability is independent of setting-page identities.

- Prerequisite: none (D1 NOT required).

- Symbols: `InstanceInfoModal` (`src/modals/modalInstanceInfo.ts:77-204`,
  header contract `:72-76`); wired ONLY to toolbar-empty right-click
  (`navbarFilters.svelte:39` import, `:3405-3411` instantiation).
  Backlog pin `+/vm-backlog120.md:349` (open-vaultman suggester, done `d99c623d`);
  live complaint is reachability.
- Writable: instance-surface entry point (toolbar `info` option per header
  comment); listing shows SASI-registry instances (not only active/visible);
  fix non-working `instance info`/`use another` path with error surfacing.
- Negative: LOCATE, never relocate, the modal.
- Red: modal-opens-from-new-entry test (`toolbarAltMenus` pattern,
  `test/unit/toolbarAltMenus.test.ts`).
- Live oracle: modal reachable from instance surface in Zenless Zone.

### E1/E2 (READY, first dispatch) — Lane 2 tree-interaction checkpoint, with B1/B3 (same-worktree conflict: shared checkbox/hover DOM in `viewTree.ts` + `explorerFiles.ts`)

- Prerequisite: B-settled DOM (conflict, not input).
- Symbols: files `onSelectionToggle` (`src/components/containers/explorerFiles.ts:3370-3396`,
  legacy `fileSelectionGesture`→`open`=replace); WORKING grammar select-mode
  row click (`:3489-3540`: plain toggles + moves anchor on add, Shift extends,
  Ctrl+Shift unions over `_orderedSelectableIds()`, headers excluded); shared
  `resolveCheckboxSelection` (`src/logic/logicSelectionTargets.ts:58-81`) +
  `resolveContextClickSelection` (`:111-200`).
- Writable: `explorerFiles.ts:3370-3396` ONLY — adopt the select-mode grammar
  for the checkbox control.
- Negative: plain row open/filter/expand clicks untouched; range-shrink stays
  slice-replace; anchor replacement + `NodeSelectionAxon` other intents
  untouched; group-header/action-only rows no-op (`isSelectable` filter);
  anchor-missing → single replace + new anchor.
- Red: check C with {A} → {A,C} anchor C; uncheck removes only target;
  Ctrl+Shift unions; shrink drops far end
  (`test/unit/shiftRangeSelection.test.ts`, `test/unit/nodeSelection.test.ts`,
  `test/unit/checkboxNewAnchor.test.ts` pattern).
- Targeted: `… test/unit/shiftRangeSelection.test.ts
  test/unit/nodeSelection.test.ts test/unit/contextClickSelection.test.ts
  test/unit/selectionTargets.test.ts`.
- Integration + live oracle: parity clicks verified in Zenless Zone tree.

### F1 (LATER-GATED) — Lane 2, after tree-interaction checkpoint + H1 profile (named input — no F code before it). NO E input: E changes checkbox grammar, not occurrence schema.

- Prerequisite: H1 group-scope profile captured (named input — no F code before it).
- Symbols: `scopeNodeLevel` (`src/logic/logicScopedSort.ts:193-197`),
  `resolveScopeSet` (`:225-232`), `levelScope` (`:393`),
  `ScopeResolutionNode.level: number|string` (`:19`),
  `projectGroupedTreeScopeState`
  (`src/logic/logicTreeGroupProjection.ts:1108,1152`),
  numeric-deriving callers (`navbarFilters.svelte:947,987,2658,2858,2895`).
- Writable: group-projection identity threading from entity/group-layer
  representation; document native/entity level vs group-layer/occurrence level
  at every `resolveScopeSet` caller. Numeric fallback ONLY when no declared
  identity exists.
- Negative: exact-key disjoint namespaces (`level:0+1` vs `level:1`); withdrawn
  arithmetic matcher stays withdrawn.
- Red: `resolveScopeSet` exact-key disjointness
  (`test/unit/scopedSort.test.ts`, `test/unit/scopeLevels.test.ts`,
  `test/unit/treeGroupProjection.test.ts`).
- Targeted: `… test/unit/scopedSort.test.ts test/unit/scopeLevels.test.ts
  test/unit/treeGroupProjection.test.ts test/unit/scopeStateResolution.test.ts`.
- Integration + live oracle: grouped expand/collapse + scope-switch in Zenless
  Zone matches H1 baseline behavior; AFTER trace shows no new hotspot.

### F2 (LATER-GATED) — Lane 2, after F1 (true input: resolved identity model)

- Symbols: NEW `ActionScopeSnapshot = {target, members, at}` with
  `captureAnchor()` / `releaseAnchor('user'|'scene-switch'|'reproject-invalid'|
  'node-deleted')`; precedence parent > level > all > scene defaults;
  instance isolation `(instanceId, sceneId, panelHandle)`.
- Writable: panel-port-scoped snapshot (travels with the port, no per-scene hardcodes).
- Negative: expand/collapse applies ONLY within captured members; scene-switch
  revalidates (missing → drop, anchor kept if non-empty, auto-release if
  empty); node deletion drops the member.
- Red: capture/release lifecycle incl. scene-switch + deletion
  (`test/unit/scopedSort.test.ts` + scope suites).
- Live oracle: anchored expand/collapse scoped to members in Zenless Zone.

### F3/F4 (LATER-GATED) — Lane 2, after F1

- Symbols/policies: mixed-depth moves preserve relative deltas; rejects — drop
  onto leaf, group-into-own-descendant (cycle guard via canonicalId ancestor
  set), empty-group creation; children preserved on move;
  create-group-with-selection clears that scene/instance axon to `0`;
  nested default order `group_preset_custom` last (DEFAULT order only, user
  cmenus stay controllable; presets materialize as snapshots).
- Red: delta preservation + adversarial rejects (spec-06 row;
  `test/unit/treeGroupProjection.test.ts`, `test/unit/groupSelectionTransaction.test.ts`,
  `test/unit/logicGroupPresets.test.ts`).
- Live oracle: group ops behave per policy in Zenless Zone.

### F5 (LATER-GATED) — Lane 2, after F1 + H2 drill trace (both true inputs)

- Symbols: engine overlay exists (`viewTree` `setScopePickMode:346`,
  `_renderScopePreview`, `logicScopePreview.scopePreviewGeometry` —
  `src/logic/logicScopePreview.ts`); navbar dispatch `beginScopePick`
  (`navbarFilters.svelte:3607-3665`); `treePanelForTab` covers
  files/tags/props/plugins (no snippets); port permits but settings panel
  lacks `setScopePickMode`/`scopeLevelForNode`/`scopeParentForNode`
  (`src/types/typePanelWidget.ts:114`); files wiring
  (`explorerFiles.ts:1642`, `explorerProps.ts:1624`, `explorerTags.ts:1245`).
- Writable: settings/addon panel port implementing the three methods FOLLOWING
  the files wiring; capability gates via existing `scopePickAvailability`
  (`logicScopePick.ts`) + `requires` rules.
- Negative: NO parallel overlay; compare file/tag/prop wiring, don't invent.
- Red: settings-panel pick-mode overlay segments render
  (`test/unit/scopePick.test.ts`, `test/unit/scopePreview.test.ts`,
  `test/unit/settingSceneInput.test.ts`).
- Live oracle: H2-style drill works from the settings surface; paired trace
  shows no new hotspot.

### G1.0–G1.6 (LATER-GATED individually) — Lane 2, after tree-interaction checkpoint; G1.0/G1.1/G1.2 preparation may run in parallel with F units, only individual contracts gate G1 integration

True internal order: G1.2 → G1.3 → G1.5 → G1.4 → G1.6; G1.0 and G1.1 free after
lane start. Prerequisite: A1/A2 done (menu-surface default orders).

- **G1.0** alt-menu catalog: NEW `src/logic/logicToolbarAltMenuCatalog.ts`
  from inline `navbarFilters.svelte:3273-3390` (`tabs, view, sort, search,
  reveal-active-file, toggle-expansion, command:*`) with stable `ActionDef`s.
- **G1.1** SASI lifecycle: `createSasiRegistry`
  (`src/logic/logicSasiRegistry.ts:95-130`; `register` throws on duplicate
  `:105-113`, `resolve` `:120-128` preserved) gains `unregister(id): boolean`,
  `register` returns disposable `SasiSubscription {dispose}`, and
  `onRegistryChange(listener): SasiSubscription`. Red:
  `test/unit/sasiRegistry.test.ts`.
- **G1.2** schema/clone/cascade: `SceneConfig` (`src/types/typeInstance.ts:24-118`,
  20 properties, NO menu layouts today) gains optional `toolbarMenuLayouts?` /
  `contextMenuLayouts?`; `cloneSceneConfig` (`src/logic/logicInstanceRegistry.ts:151-158`)
  deep-clones via `cloneMenuLayoutMap`; cascade
  (`src/logic/logicSettingsCascade.ts`) precedence Defaults
  (`TOOLBAR_MENU_DEFAULT_ORDER`/`FILES_MENU_DEFAULT_ORDER`) → Global →
  Instance-self → Scene → Panel-outlet; absent key falls through; `diffSceneConfig`
  sparse-diffs via `sameFilesMenuLayout`. Red: `test/unit/settingsCascade.test.ts`,
  `test/unit/instanceRegistry.test.ts`, `test/unit/sceneConfigMigration.test.ts`.
- **G1.3** relay: `SceneConfigPort` (`src/logic/logicSceneConfigPort.ts` —
  port exists per `test/unit/sceneConfigPort.test.ts`) gains
  `read/propose/reset{Toolbar,Panel}MenuLayout`; `VaultmanFrame.svelte`
  propagates the port (`:1642` NavbarPanelWidgetHost, `:1691` FiltersPage);
  `pageFilters.svelte:2006` global read becomes
  `sceneConfigPort.readToolbarMenuLayouts(activeTab)`.
  Reset alignment: scene reset deletes ONLY
  `record.scenes[scene].*MenuLayouts[kind]` (F1 decision at scene level).
- **G1.4** tree-row adapter: `AddonExplorerDataSource`
  (`src/logic/logicAddonDataSource.ts`, cf. `test/unit/addonDataSource.test.ts`)
  gains optional `AddonExplorerEditCapabilities`
  (`canReorder/canRename/canDrop/onReorder/onRename/onDelete`); `explorerPlugins.ts`
  wires `PluginsExplorerPanel` to `UnifiedTreeView` row events
  (`viewTree.ts:171-173` types, `:1697` draggable, `:1835` dragstart,
  `:1845` drop, `:2692` dragover) with MIME
  `application/x-vaultman-cmenu-item`, optimistic transaction + rollback.
- **G1.5** model: NEW `src/logic/logicCmenuDataSource.ts` +
  `src/logic/logicCmenuScene.ts`; persisted store keeps canonical action IDs;
  tree rows project composite URNs `${scope}::${menuKind}::${actionId}`;
  reuse pure ops (`mergeFilesMenuLayout`, `defaultFilesMenuLayout`,
  `normalizeFilesMenuLayout`, `addFilesMenuDivider`, `addFilesMenuSubmenu`,
  `removeFilesMenuItem`, `setFilesMenuVisibility`, `setFilesMenuParent`,
  `setFilesMenuSubmenuIdentity`, `reorderFilesMenuItems`, `removeMenuOverride`)
  and projections (`projectToolbarMenu`, `projectFilesMenu`).
- **G1.6** host: NEW `cmenuSceneHost.svelte` (reuse `ApiSceneHost` pattern via
  `createApiSceneConfigPort` in `src/logic/logicApiSceneConfig.ts`) + universal
  toolbar integration.
- Structural guard (no code needed): `FilesMenuItem.parent?` exists ONLY on
  `action` (`logicFilesContextMenu.ts:12-21`) — submenus cannot nest
  (`depth <= 1`); cycles structurally impossible; `canDrop` additionally
  rejects action-inside-action and submenu-inside-row.
- Negative oracles G1-ORACLE-01..09 (rev3 `08b` §5) all hold.
- Targeted: sasi/addon/cascade/port suites above + `test/unit/toolbarMenuSasiParity.test.ts`.
- Live oracle: full `cmenuScene` projection with DnD/move/rename in Zenless Zone
  (supervisor rejected button-only downgrade — no UI reduction).

### H1/H2 (SEPARATELY SCHEDULED preparation) — BEFORE any F/F5 code (named inputs), but H preparation does NOT block independent B/E frontend edits

- H1 group-scope benchmark: grouped-tree expand/collapse + scope-switch trace
  on baseline build via `cdp-profile.mjs` + action script (1000µs interval,
  exact vault URL, one tab, scoped eval, no `obsidian-cli`).
- H2 settingScene drill trace: pick-mode open → hover preview → commit trace on
  baseline. When the drill surface is unavailable, capture the current
  gated/unsupported behavior with evidence (exact surface label + trace paths)
  — NEVER fabricate a pick-hover-commit trace. Note honesty boundary:
  plugin-settings modal ≠ settingScene — label every trace with the exact surface.
- No thresholds; perf acceptance = AFTER shows no new attributed hotspot on the
  touched path (supervisor judges; `11-*` protocol).

## 5. Ownership & acceptance summary (staged bounded queues, not mega-lanes)

| Front | Dispatch | Owner order | Gate |
|---|---|---|---|
| C3+C2/C4 | Lane 1, first dispatch | settings-updates worker | per-issue red + integration + live oracle; supervisor verifies update-lifecycle checkpoint before any D/C5 implementation |
| B1/B3+E1/E2 | Lane 2, first dispatch | tree-interaction worker | per-issue red + integration + live oracle; supervisor verifies tree-interaction checkpoint before any F/G implementation |
| H1/H2 captures | separately scheduled preparation | scope worker, BEFORE any F/F5 code; does NOT block B/E | traces exist, labeled (or gated-behavior evidence when drill unavailable); H2 never fabricates |
| C1, C5, D1→D2, D3 | later-gated Lane 1 | same worker after checkpoint | individual contracts (§4); D3 independent of D1; no C2/C4→C5, no C5→D |
| F1→F2/F3/F4→F5 | later-gated Lane 2 | same worker after checkpoint + H inputs | H-gated; no E input on F1 |
| G1.0–G1.6 | later-gated Lane 2 | same worker (registry continuity); G1.0/G1.1/G1.2 prep may parallel F | oracles 01–09; individual contracts only |
| B2, H1/H2, FQ1–FQ4 | supervisor | individual approvals; B2 needs runtime proof | no code on unproven owners; FQ1–FQ4 are independent parallel reviewer approvals, not serialized |

Reconciliation: NO unsolicited rebase. Commits are preserved; integration uses
supervisor-directed reviewed cherry-picks/merge only, with vm-adversarial-merge
gates; no history rewriting. The `:5030` title overlap and shared
`explorerPlugins.ts` chain require focused reconciliation suites (not landing
order alone). Launcher-ready (NOT launched here):
`lane run u130-polish-lane-1 /data/data/com.termux/files/home/wt/u130-panel-content
/data/data/com.termux/files/home/wt/u130-c1-grouping/.omo/plans/u130-polish-1003-lane-1.md
--pool muse13` and
`lane run u130-polish-lane-2 /data/data/com.termux/files/home/wt/u130-row-polish
/data/data/com.termux/files/home/wt/u130-c1-grouping/.omo/plans/u130-polish-1003-lane-2.md
--pool antigravity`, both via `pkmai-delegate`. Checkpoints and allowlists remain
prompt instructions, not CLI flags. Final FQ1–FQ4 approvals are individual and parallel.

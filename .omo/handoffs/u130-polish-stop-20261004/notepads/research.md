# U130 Polish Research Recovery Record & Manifest

## 1. Crash Recovery Record

- **Incident Context:** The Android process / tmux runtime crashed, leaving prior workers with no surviving processes. Prior worker attempts (`d_20261002_163146_8943_25482` stale scout, `d_20261003_140713_9006_4284` AGY worker) were interrupted.
- **Recovery Worker Identification:**
  - **Harness:** `agy` / direct pair-programming session
  - **Model:** Gemini 3.8 Flash (High) (`gemini-3.8-flash-high`)
  - **Provider:** `antigravity-gemini`
  - **Concurrent Dedicated Profiler:** `d_20261003_140844_14727_7630` (`u130-profile-recovery-m13-retry`, pool `muse13`, model `opencode/muse-spark-1.3-contributor-free`) exclusively owns live profiling against the PC Web Lab vault `Zenless Zone`. All live runtime measurements remain marked pending to avoid race conditions.
- **Target Verification:**
  - **Target Worktree:** `/data/data/com.termux/files/home/wt/u130-c1-grouping`
  - **Canonical Worktree:** `/data/data/com.termux/files/home/wt/u130` (READ-ONLY)
  - **Command:** `GIT_MASTER=1 git rev-parse HEAD && GIT_MASTER=1 git status --short`
  - **Target HEAD:** `1bfcbfbe71ca6dc923e4f97a0cb3bd1584ae0977`
  - **Tracked Status:** Clean (`?? .opencode/` preserved, skill SHA256 `b6bc025a74573cd685154e188ac423206c2759aa079db075abfd592379a78cd7`)
  - **Canonical Divergence:** 0 commits (both worktrees at identical commit `1bfcbfbe71ca6dc923e4f97a0cb3bd1584ae0977`). No merges, rebases, or git mutations performed.
- **Navigation Methodology:**
  - Single graph-first navigation check performed on `.codegraph/source.json`.
  - Full code graph index database was absent.
  - Immediate fallback to bounded source search (`git grep` and exact file reads scoped strictly to `src/` and `test/`) without waiting.
  - All command invocations executed synchronously to completion.

---

## 2. Research Deliverables Manifest

Three comprehensive, uncompressed technical research reports were produced and written directly to `.omo/evidence/u130-polish-1003/research/`:

### 1. `lane-ab.md`
- **Location:** `.omo/evidence/u130-polish-1003/research/lane-ab.md`
- **Issue A (View-Menu Reset and cMenu Structure):**
  - Identifies root cause of missing dividers: `TOOLBAR_MENU_CANONICAL_ORDER['view_menu']` in `logicToolbarMenuCatalog.ts:238` omits `DIVIDER_MARK` (`'---'`), causing `defaultFilesMenuLayout()` to generate an action-only array. When reset saves this array, `projectToolbarMenu()` sets `hasSavedLayout = true`, which unconditionally strips all source dividers from `navbarFilters.svelte` (`view_menu.divider.*`).
  - Decomposes the unapproved `cmenuScene` concept: `cmenuScene` does not exist in the codebase. Current menu configuration lives in `VaultmanSettings.ts:2120-2146` via flat `Setting` rows, drag handles, and submenus.
  - Establishes three competing causal hypotheses (H1 catalog omission, H2 reset persistence defect, H3 projection fallback failure) with falsification criteria.
- **Issue B (Duplicate Hover-Action Tooltips):**
  - Traces dual tooltip ownership to redundant DOM attributes and API calls: `viewTree.ts:2560-2561` sets both `aria-label` and HTML `title`; `viewTree.ts:2673, 2680` sets `aria-label` and invokes `setTooltip()`; `navbarFilters.svelte:5005-5006` sets both `aria-label` and `title`.
  - Analyzes collision between Obsidian core delegated tooltip listener on `[aria-label]` and Chromium browser native OS tooltip on `[title]`.
  - Documents `toggle-expansion` scope precedence (`action_scope = 'all'` must remain locked until release).

### 2. `lane-cd.md`
- **Location:** `.omo/evidence/u130-polish-1003/research/lane-cd.md`
- **Issue C (Settings Update Markers, Dividers, and History Sets):**
  - Integrates user intent clarification: "By type" filter menu must offer: 1) `all` / `plugins` / `snippets`, 2) divider (`---`), 3) `state on` / `state off` / `updates available`. Demonstrates that `NODE_TYPE_MENU_OPTIONS` in `logicSortMenu.ts` completely lacks entries for `plugins` and `snippets`.
  - Diagnoses unconditional rendering of `update_all_plugins` in `navbarFilters.svelte:5028-5045`, which fails to gate on pending update count.
  - Maps update marker volatility: `PluginUpdatesService` uses an in-memory `snapshot = new Map()` that loses all update badges across restarts.
  - Examines history import/export: `SettingsDataPayload` in `modalSettingsDataTransfer.ts` only handles filter templates, queue templates, and saved layouts, omitting file opening history and custom sets.
- **Issue D (Missing Global-Settings Children and Instance Modal):**
  - Traces missing global settings children to `serviceSettingSearchAdapter.ts:262, 266`, where `candidate.tab === pluginId` rejects core global setting tabs (e.g. `editor`, `appearance`).
  - Demonstrates dedup collision with key `${g.page}::${g.pagePath}` when page names are blank or shared across tabs.
  - Successfully locates the instance modal as `InstanceInfoModal` in `src/modals/modalInstanceInfo.ts` (wired to toolbar empty alt-menu in `navbarFilters.svelte:3405`), fulfilling backlog reference `^7618d6`.

### 3. `lane-ef.md`
- **Location:** `.omo/evidence/u130-polish-1003/research/lane-ef.md`
- **Issue E (Checkbox Select-From-New-Anchor):**
  - Isolates root cause in `logicNodeSelection.ts:28-62` (`updateFileSelection`) and `logicNodeSelection.ts:118` (`NodeSelectionAxon`): bare checkbox click passes `addMode = true`, but `fileSelectionGesture` resolves to `'open'`, causing `updateFileSelection` to replace the entire selection with `[targetPath]`.
  - Range selection via Shift+Click or Ctrl+Shift+Click executes destructive replacement (`selectedPaths = new Set(ordered.slice(...))`) instead of an additive union, dropping previous disjoint selections.
  - Establishes behavioral oracle and invariant that earlier selections must survive new anchor additions.
- **Issue F (Grouping, Scope Capability, and settingScene Visual Gaps):**
  - Clarifies that `0+1` (`level:0+1`) is a **relative scope expression** (`base: 0, offset: 1`), not independent numeric scopes 0 and 1.
  - Identifies gap in `resolveScopeSet` (`logicScopedSort.ts:228-232`), which only tests exact match against `level:${level}` and fails to resolve relative offsets (`level:${base}+${offset}`).
  - Maps parent movement at `depth + 1` and relative depth calculations for mixed-depth selected nodes.
  - Documents the architectural status of `settingScene` scope drill and `hover-border-box`: authored as a planned design in `scope-intent-2026-10-03.md` but intentionally deferred from current product code.

---

## 3. Boundary & Safety Compliance Confirmation
- Zero product edits, zero test modifications, zero package installations, zero Git commits or branch alterations.
- No live Obsidian vault interactions, no CDP connections, no `obsidian-cli` execution.
- Worktree remains at HEAD `1bfcbfbe71ca6dc923e4f97a0cb3bd1584ae0977` and clean of tracked changes.

## 4. Spec-Worker Checkpoint (2026-10-03, Sisyphus, zen/muse-spark-1.3)

- HEAD verified pre/post (so far): target `1bfcbfbe71ca6dc923e4f97a0cb3bd1584ae0977`, canonical identical, tracked status `?? .opencode/` only. Canonical `wt/u130` untouched (read-only).
- Graph index absent (only `.codegraph/source.json`); bounded `grep`/`sed` fallback used throughout. No product edits, builds, deploys, commits.
- `check-doc-health --path work/performance`: `doc health: OK` (4 pre-existing soft WARNs, unrelated, not repaired).
- `selftime-check.mjs`: 18 `eq` assertions pass (exit 0) — worker-report Addendum A claim of "19/19" is corrected to 18/18.
- Targeted vitest: 12 files / 131 tests pass (projection, catalog, updates, node-types, adapter, selection, scope, group-projection, addon-children, page-cache); tooltip/alt-menu/parity shape: 6 files / 63 tests pass.
- Supervisor corrections validated against source (details in spec package `12-appendix-corrections.md`): logicAddonExplorer 755-767 comment is about plugin-children catalog (no snippet-node sentence); `listPluginSettingPages(app, pluginId)` callers always pass plugin ids (`resolvePluginSettingsChildren` <- `resolveRestPluginNode`); `levelScope` preserves string levels so relative `level:0+1` resolves when the level string reaches it (numeric tree-walk path does not); checkbox call-site comment declares plain click = replace; `setTooltip`+`aria-label` co-exists without `title` on toggle/action cells; backlog block `^7618d6` not found in repo (location unknown, not invented).
- Spec package target: `/data/data/com.termux/files/home/vaultman/.agents/docs/work/performance/specs/2026-10-03-u130-polish/` (new dir, no Room contention; Room offers no claim verb — status shows no active claims/conflicts).

## 5. Spec-Worker Closing Record (2026-10-03, Sisyphus)

- Package written: 13 files (index + 01..12) under vaultman canonical `.../specs/2026-10-03-u130-polish/`, all shards <200 lines, `check-doc-health --path work/performance/specs/2026-10-03-u130-polish`: `doc health: OK`.
- `check-doc-health --path work/performance`: `doc health: OK` (4 pre-existing soft WARNs elsewhere, untouched).
- Target after-check: HEAD `1bfcbfbe71ca6dc923e4f97a0cb3bd1584ae0977`, tracked clean (`?? .opencode/` only) — verified in closing command. No product source/test edits, builds, deploys, commits, worktrees, or config changes. No plan checkboxes touched.
- Findings appended here (§4 checkpoint + this record) and `profiling.md` correction filed. Implementation stays gated on supervisor approval.

## 6. Rev2 Refinement Checkpoint (2026-10-03, Sisyphus, zen/muse-spark-1.3)

- Package rewritten to rev2: 14 files (index + 01..13), all shards <200 lines, health OK on new dir.
- query-docs retrieval used: U130-110 (cmenu authority), selection-gestures brief, intent.md (invariants/order/precedence), spec-06 SASI, selection-service briefs.
- Backlog ^7618d6 pinned by PC-vault filesystem read: `+/vm-backlog120.md:349` (open-vaultman suggester, done d99c623d); live complaint is reachability (:279). Vault contents untouched.
- F1-F4 applied as binding; 07 matcher withdrawn; anchor/selection/global/drill seams traced to concrete symbols; per-unit ownership/tests/V8 paired protocol; H1/H2 named missing inputs; 13-step plan breakdown for transcription (no checkboxes touched).
- Tests: 18 files / 194 pass. HEAD `1bfcbfbe`, tracked clean (`?? .opencode/`). No product/test edits, builds, deploys, commits, installs.

---

## 7. cmenuScene Architecture Review & Specification Refinement (2026-10-04, Gemini 3.8 Flash High)

### A. Adversarial Architecture Audit & Grounded Findings
- **Phantom Blocker Falsified:** Verified against Git history that `feat/instance-surfaces` merged on 2026-08-21 (`c94df911`). No active worktree, branch, or owner exists. Spec 08's claim of being blocked on an external agent is invalid; G1 must own its schema, cascade, relay, and catalog prerequisites.
- **Current Target Source Audits:**
  - `SceneConfig` (`src/types/typeInstance.ts:24-118`): Contains 20 per-instance properties but zero menu layout storage (`toolbarMenuLayouts` and `contextMenuLayouts` absent).
  - Cascade (`src/logic/logicSettingsCascade.ts`): Resolves only existing 20 properties; no menu cascade.
  - Frame Relay (`src/VaultmanFrame.svelte`): Does not relay menu layouts via `sceneConfigPort`. `pageFilters.svelte:2006` reads global `plugin.settings.toolbarMenuLayouts`.
  - Registries (`logicSasiRegistry.ts`, `serviceContextMenu.ts`): `SasiRegistry.register()` throws on duplicate and lacks `unregister()`; `ContextMenuService` ignores duplicate and lacks unregistration; neither offers change subscription events.
  - Alt-Menus (`navbarFilters.svelte:3273-3390`): Procedural `if (localId === ...)` blocks in Svelte markup; no `ActionDef` catalog or serialized schema.
  - Tree-Row Editing (`explorerPlugins.ts`): Implements `AddonExplorerPanelPort` for `UnifiedTreeView` but does not wire `onDragStart`, `onDrop`, or inline rename to row mutations.
- **Structural Invariant Discovery (Cycles & Depth):**
  - Audited `FilesMenuItem` (`logicFilesContextMenu.ts:12-22`): `parent?: string` is defined exclusively on `action` items. `submenu` items cannot have a parent. Therefore, multi-level nesting and submenu cycles (`A -> B -> A`) are structurally prohibited by schema (`depth <= 1`), not runtime recursion guards.

### B. Rev3 Specification Package (G1 Concrete Refinement)
- **User Requirement Preserved:** Full `cmenuScene` projection using addons explorer and universal toolbar with tree-row DnD, move, and rename slots. Supervisor explicitly rejected button-only UI downgrade.
- **G1 Prerequisite Task Ownership:**
  - `G1.0`: Toolbar alt-menu catalog extraction (`src/logic/logicToolbarAltMenuCatalog.ts`).
  - `G1.1`: SASI lifecycle (`unregister()`, `SasiSubscription.dispose()`, `onRegistryChange`).
  - `G1.2`: `SceneConfig` per-instance schema, deep clone in `cloneSceneConfig`, and 3-tier cascade (`Defaults -> Global -> Scene`).
  - `G1.3`: `SceneConfigPort` relay methods and propagation in `VaultmanFrame.svelte`.
  - `G1.4`: AddonExplorer tree-row capability adapter (`AddonExplorerEditCapabilities` for `onReorder`, `onRename`, `canDrop`).
  - `G1.5`: `cmenuScene` data source & projection model (`logicCmenuDataSource.ts`, `logicCmenuScene.ts`).
  - `G1.6`: Host wiring & universal toolbar integration (`cmenuSceneHost.svelte`).
- **Backward Compatibility:** Preserves canonical action IDs in stored settings payloads while projecting composite URNs (`${scope}::${kind}::${actionId}`) in tree rows to prevent cross-surface collision.
- **Documentation Deliverables & Verification:**
  - `08-cmenuscene-design.md`: Core architectural specification and prerequisite ownership.
  - `08a-cmenuscene-relay-cascade.md`: Exact schema, deep clone, cascade, port, and A1/A2 reset alignment.
  - `08b-cmenuscene-dnd-tree.md`: Tree-row DnD capability adapter, nesting rules, and 9 acceptance test oracles.
  - `index.md` & `12-appendix-corrections.md`: Updated readiness note and change record.
  - Verified `node --experimental-strip-types .../check-doc-health.ts --path work/performance/specs/2026-10-03-u130-polish`: `doc health: OK` (0 failures, 0 warnings).
- **Safety Boundary:** Zero product source/test files modified; Muse's active files (`VaultmanSettings.ts`, `logicToolbarMenuCatalog.ts`, `logicToolbarMenuProjection.ts`, `test/unit/menuResetDividers.test.ts`) left completely untouched; no Git commits or plan checkboxes modified.

---

## 8. Dispatch Revision Record (2026-10-04, Sisyphus, sole-author doc task)

No delegation or subdelegation used. No product source, tests, dependencies,
config, metrics, skills, branches, commits, deployments, or worktrees edited.
No installs, builds, live QA, obsidian-cli, profiling, or global scans run.
Frontend contracts inspected via bounded reads only, with `frontend` and
`modern-web-guidance` skills loaded (no network retrieval: the B1 fix removes a
native `title` and keeps `aria-label`s — no new web API, accessible names are
the contract).

### A. Worktree census + ancestry (read-only `git worktree list`, rev-parse, status)

- Target `wt/u130-c1-grouping`: `fix/u130-polish-update-1002` @ `f0ac41f6`,
  tracked clean (`?? .agents/`, `?? .opencode/`,
  `?? test/unit/hoverTooltipOwnership.test.ts` only).
- `1bfcbfbe` IS-ancestor of `f0ac41f6`: YES. `a317da06` IS-ancestor: YES.
  Eventual lane branches base on `f0ac41f6` (includes `a317da06`), not `origin/dev`.
- Reusable candidates (all tracked-clean, all verified ancestors of `f0ac41f6`,
  so new lane branches from `f0ac41f6` preserve their history with no
  reset/delete/force):
  - `wt/u130-row-polish` (`fix/u130-row-polish-1001` @ `6c9d5a84`) → Lane 2.
  - `wt/u130-panel-content` (`fix/u130-panel-content` @ `5b26cd65`) → Lane 1.
  - `wt/u130-groups-integ-0924` (`integ/u130-groups-0924` @ `1ff00c5a`) →
    read-only reference, never a lane tree.
- Canonical `wt/u130` (`release/beta9` @ `1bfcbfbe`, clean) read-only, never
  disposable.

### B. Bounded symbol validation (exact hits, no global scans)

- A (done): `removeMenuOverride` (`logicFilesContextMenu.ts:362`),
  `resetToDefaults` (`VaultmanSettings.ts:2465`), `TOOLBAR_MENU_DEFAULT_ORDER`
  (`logicToolbarMenuCatalog.ts:265`), `readLayout` merge target
  (`logicToolbarMenuProjection.ts:138`).
- B: dual `title`+`aria-label` (`viewTree.ts:2560-2561`,
  `navbarFilters.svelte:5005-5006`, update-toolbar `title={toolbarNodeTitle(…)}`);
  guard `toolbarNodeTitle` (`:4090-4093`); title-free
  (`viewTree.ts:2597-2603, 2672-2682` + `setTooltip` `:2680`).
- C: `NODE_TYPE_MENU_OPTIONS` (`logicSortMenu.ts:141-186`, no plugins/snippets);
  `PLUGIN_UPDATE_TOOLBAR_ACTIONS` (`navbarFilters.svelte:1425-1428`, no
  pending-count gate); `snapshot = new Map()` + `snapshot.clear()` failure paths
  (`servicePluginUpdates.ts:23,62,67,89,96`); `SettingsDataPayload`
  (`modalSettingsDataTransfer.ts:10`, build/parse `:22,:39`).
- D: `GLOBAL_SETTINGS_TAB_IDS` (`logicAddonExplorer.ts:1148-1158`),
  `buildGlobalSettingsNodes` (`:1255`), `listPluginSettingPages` (`:16,:817`);
  snippet `providerId:'snippets'` (`explorerSnippets.ts:353`);
  `InstanceInfoModal` (`modalInstanceInfo.ts:77`; import + instantiation
  `navbarFilters.svelte:39,3405`).
- E: `onSelectionToggle` (`explorerFiles.ts:3370`), working select-mode grammar
  (`:3489-3540`), `resolveCheckboxSelection` (`logicSelectionTargets.ts:58-81`),
  shared policy (`:111-200`).
- F: `scopeNodeLevel` (`logicScopedSort.ts:193-197`), `resolveScopeSet`
  (`:225-232`), `levelScope` (`:393`), `ScopeResolutionNode` (`:19`).
- G: `SasiRegistry.register` throws, no `unregister`
  (`logicSasiRegistry.ts:105-113`); `SceneConfig` 20+ props, no menu layouts
  (`typeInstance.ts:24-53`); `FilesMenuItem.parent?` action-only
  (`logicFilesContextMenu.ts:12-21`); port/frame/drag seams
  (`VaultmanFrame.svelte:94,392,443,472`, `viewTree.ts:171-173,1697,1835,1845,2692`).
- Test/store files cited in the matrix all verified present under `test/unit/`
  (`singleRowTooltip`, `tooltipReadyBeforeHover`, `nodeTypeFilters`,
  `servicePluginUpdates`, `shiftRangeSelection`, `nodeSelection`,
  `settingPageCache`, `u130ParityA2/Mech`, `u130CanonicalShape`,
  `logicAddonPluginSettingsChildren`, `scopedSort`, `scopeLevels`,
  `scopePreview`, `scopePick`, `treeGroupProjection`, `sasiRegistry`,
  `settingsCascade`, `sceneConfigPort`, `addonDataSource`, `toolbarMenuSasiParity`,
  `serializeLastOpened`, `lastOpenedPersistence`, `contextClickSelection`,
  `selectionTargets`, `checkboxNewAnchor`, `toolbarAltMenus`,
  `navbarFiltersSource`, `menuResetDividers`); `logicSceneConfigPort.ts`,
  `logicApiSceneConfig.ts`, `logicAddonDataSource.ts`,
  `serviceOpenedHistoryStore.ts`, `serviceLastOpened.ts`, `logicLastOpened.ts`,
  `logicScopePreview.ts`, `typePanelWidget.ts`, `modalSettingsDataTransfer.ts`
  all exist.

### C. Spec-10 audit outcome

Withdrew the global 10-step serialization (kept as intra-lane conflict order),
the phantom instance-surfaces/plan-D external blocker (merged `c94df911`),
and the rev1 arithmetic matcher (exact-key disjointness stands). Retained true
inputs D1→D2/D3, C3→C2/C4, C3→C5, F1→F2/F3/F4→F5, H1→F, H2→F5, A(done)→G1,
G1.2→G1.3→G1.5→G1.4→G1.6. No dependencies invented. Distinguished input
dependencies, same-worktree conflicts (B→E; C1→C3→C2/C4→C5; D1→D2/D3),
semantic merge conflicts (`navbarFilters.svelte` disjoint regions, Lane 1 → Lane 2),
provider capacity (≤2 workers, zen + antigravity only), and exclusive live-QA turns.

### D. Tooltip attempt + conversation disposition

- Attempt `d_20261003_235730_2824_19729`: UNVERIFIED TIMEOUT — log says print
  timeout 30m, SUCCESS with empty response; exit 0 is NOT acceptance. No
  `.omo/` record of the ID exists (bounded grep, no hits); recorded here from
  the task statement, not re-derived.
- Conversation `49236173-4206-415e-9944-a499eef8df8f` may resume for a bounded
  checkpoint, not a new unbounded redo.
- Tracked target tree checked BEFORE any no-op claim: `git status --short`
  shows zero tracked modifications vs `f0ac41f6` (only `??` entries). B1/B3 is
  NOT a no-op: live BEFORE evidence (`meta-hover-tooltip-before.json`,
  `nonMinimalDualCount: 6`) proves dual ownership, and partial work exists as
  untracked `test/unit/hoverTooltipOwnership.test.ts` (208 lines, preserved).

### E. Outputs written (docs only)

- `.omo/plans/u130-polish-1003.md` — appended Dispatch Revision section only;
  every acceptance checkbox and its checked state preserved; FQ1–FQ4 untouched.
- `.omo/plans/u130-polish-1003-dispatch-matrix.md` — NEW sibling shard (audit,
  taxonomy, ownership, per-issue contracts, reconciliation).
- `.omo/plans/u130-polish-1003-lane-1.md`, `.omo/plans/u130-polish-1003-lane-2.md`
  — NEW, exactly two ready lane prompts (ownership, collisions, bounded scope,
  no-subdelegation, steps, acceptance, commands, handoff order).
- This file + `implementation.md` — appended records only, nothing overwritten.

## 9. Dispatch-Correction Record (2026-10-04, Sisyphus, sole-author doc task)

Documentation only. No delegation. Worktree
`/data/data/com.termux/files/home/wt/u130-c1-grouping` only. No product/test
code, dependencies, config, metrics, skills, branches, commits, deployments,
worktrees, or baseline evidence edited. No installs/builds/live-QA/reloads.
Only the existing plan, matrix, lane prompts, notepads, and already-identified
specs were read; bounded source reads were limited to questioned exact symbols
(`modalInstanceInfo.ts:77-204`, `navbarFilters.svelte` update/title lines,
`servicePluginUpdates.ts:23-100`, `viewTree.ts:418-419`, `main.ts:293`,
`hoverTooltipOwnership.test.ts` header, `explorerPlugins.ts` tooltip lines).

### Rejected points fixed (source-grounded)

- D1→D3 REMOVED: `InstanceInfoModal extends Modal` (`modalInstanceInfo.ts:77`,
  header contract `:72-76`) is already imported (`navbarFilters.svelte:39`)
  and instantiated (`:3405-3411`) on the toolbar-empty path — reachability is
  independent of setting-page identities. Retained: D1→D2 only.
- E→F1 REMOVED: E rewires checkbox grammar (`explorerFiles.ts:3370-3396`
  adopting `:3489-3540` via `resolveCheckboxSelection`), not occurrence
  schema; F1 threads declared identity symbols only. Only real produced
  outputs may block.
- G1.0/G1.1/G1.2 preparation may parallel F units; only individual contracts
  gate G1 integration (internal G1.2→G1.3→G1.5→G1.4→G1.6).
- C1 need not precede C3; C2/C4 depend on the badge contract (gate + tooltip
  feed), not all cache I/O. No C2/C4→C5, no C5→D invented (C5 needs only
  history-store conventions).
- Mega-lanes replaced by staged bounded queues: first-dispatch Lane 1 =
  C3+C2/C4 (update-discovery lifecycle); Lane 2 = B1/B3+E1/E2
  (tree-interaction deliverable). H1/H2 separately scheduled before F work but
  not blocking B/E. Lane 2 NO F/G implementation until the tree-interaction
  checkpoint is supervisor-verified; Lane 1 NO D/C5 implementation until the
  update-lifecycle checkpoint is supervisor-verified. Bounded checkpoints, not
  global serialization.
- Preserved: B2 runtime-proof gate (blocks ONLY B2), H1/H2 pre-change
  profiles as named inputs, FQ1–FQ4 as independent parallel reviewer
  approvals.
- H2 rule: drill unavailable → capture current gated/unsupported behavior with
  evidence; never fabricate a pick-hover-commit trace.
- Shared-file conflicts declared: `navbarFilters.svelte:5030` title line
  inside Lane-1 `:5025-5045` update region (`:5029-5045` each-block verified by
  bounded grep); `explorerPlugins.ts:379,1208-1217` → `viewTree.ts:2659`
  chain shared. Reconciliation tests required.
- REBASE instructions removed: commits preserved; integration via
  supervisor-directed reviewed cherry-picks/merge only, vm-adversarial-merge
  gates, no history rewriting.
- C3: discovery cache separate from native install authority (`managerFor`
  adapter authoritative); no blind `snapshot.clear()` removal at `:62,67,89,96`
  — retain-then-reconcile installed>=pending; `main.ts:293` constructor wiring
  included if needed; live oracle = scoped plugin reload only (never
  restart/reopen Obsidian); no journals/quarantine beyond approved adapter
  necessities.
- Hover partial: `test/unit/hoverTooltipOwnership.test.ts` (208 lines, 5882
  bytes, mtime 2026-10-04 05:27:41Z, untracked, `git log --all -- <path>`
  empty → never committed) is a partial artifact whose exact attribution must
  be clarified from timestamps/log evidence. Prior Muse attempt
  `d_20261004_035125_19887_30353` recorded; no chat session recoverable.
  Supervisor finding preserved: four failures are harness init errors
  (`this.containerEl.toggleClass is not a function` at `viewTree.ts:419` —
  jsdom plain `div` lacks Obsidian `HTMLElement.toggleClass`), not behavioral
  RED. Lane 2 must adapt using existing renderer tests + production renderer;
  no test edits in this preparation task. Tooltip timeout
  `d_20261003_235730_2824_19729` preserved as UNVERIFIED TIMEOUT.
- Base/trees: `f0ac41f6` (incl. `a317da06`, from `1bfcbfbe`), not
  `origin/dev`; reusable `wt/u130-panel-content` (`fix/u130-panel-content` @
  `5b26cd65`) and `wt/u130-row-polish` (`fix/u130-row-polish-1001` @
  `6c9d5a84`), branches preserved; canonical `wt/u130` forbidden.
- Launcher-ready (NOT launched, no worktrees created):
  `lane run --pool muse13 --worktree …/wt/u130-panel-content --branch-from f0ac41f6 --prompt .omo/plans/u130-polish-1003-lane-1.md --checkpoint update-lifecycle --allow C3,C2,C4 --deny C1,C5,D-impl`
  and
  `lane run --pool antigravity --worktree …/wt/u130-row-polish --branch-from f0ac41f6 --prompt .omo/plans/u130-polish-1003-lane-2.md --checkpoint tree-interaction --allow B1,B3,E1,E2 --deny F,G-impl`,
  via `pkmai-delegate`, finite checkpoints, explicit `muse13` + `antigravity`
  pools. No implementation claimed; no acceptance box marked.


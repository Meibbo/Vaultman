# Lane 2 Prompt — First Dispatch: Tree Interaction (B1/B3+E1/E2); H1/H2 Separately Scheduled, F/G Later-Gated

Ready lane prompt for ONE worker. Sibling of `.omo/plans/u130-polish-1003.md`;
full matrix in `.omo/plans/u130-polish-1003-dispatch-matrix.md` (§4 per-issue
contracts, §2 dependency taxonomy). Spec authority:
`vaultman/.agents/docs/work/performance/specs/2026-10-03-u130-polish/` shards
`01`, `03`, `06`, `07`, `08`, `08a`, `08b`, `09`, `11`, `12`.
Staged bounded queue: this dispatch implements ONLY B1/B3+E1/E2 (coherent
tree-interaction deliverable). H1/H2 are separately scheduled preparation
before F work but do NOT block B/E. NO F/G implementation permission until the
supervisor verifies the tree-interaction checkpoint. Bounded checkpoint, not
global serialization. Tooltips are steps 1–2 of the first dispatch (not of a
mega-lane).

## 1. Worktree ownership (reuse, never create)

- Work ONLY in `/data/data/com.termux/files/home/wt/u130-row-polish`
  (branch `fix/u130-row-polish-1001` @ `6c9d5a84`, tracked clean, verified
  ancestor of target `f0ac41f6`).
- The existing lane branch `fix/u130-polish-lane-2` is already checked out here
  at verified target `f0ac41f6` (which includes `a317da06`; never base on
  `origin/dev`). Preserve the original branch and history: do not create a
  duplicate branch, reset, rebase, delete, force, or merge
  `fix/u130-row-polish-1001`.
- NEVER touch canonical `/data/data/com.termux/files/home/wt/u130` (read-only),
  NEVER select it as disposable. Do not create any worktree.
- `u130-groups-integ-0924` (`integ/u130-groups-0924` @ `1ff00c5a`) is
  READ-ONLY precedent for scope/group policies — read, never check out, branch,
  or edit. Lane 1 owns `/data/data/com.termux/files/home/wt/u130-panel-content`;
  do not write there.

## 2. Collision files (yours vs Lane 1) + declared semantic conflicts

- You own these `navbarFilters.svelte` regions: scope callers
  (`:947,987,2658,2858,2895`), pick dispatch (`:3607-3665`, later-gated F5 —
  do NOT implement now), title guard (`:4089-4093`),
  toggle-expansion/toolbar buttons (`:5000-5013`, plus `:5030` titles).
  Lane 1 owns (`:1425-1428, :4150, :5025-5045`).
- DECLARED OVERLAP (reconciliation tests required, landing order NOT enough):
  your `:5030` `title={toolbarNodeTitle(translate(labelKey))}` line sits INSIDE
  Lane 1's `:5025-5045` update region, and the `explorerPlugins.ts`
  badge-tooltip chain (`:379,1208-1217` → `viewTree.ts:2659`) is shared.
  Both lanes run focused reconciliation suites + `pnpm run check` +
  `git diff --check` at integration.
- You solely own for this dispatch `viewTree.ts` hover-action/title blocks and
  `explorerFiles.ts:3370-3396` selection region (adopting the `:3489-3540`
  grammar + `logicSelectionTargets.ts:58-200`). F/G paths
  (`logicScopedSort.ts`, `logicTreeGroupProjection.ts`, scope preview/pick,
  SASI registry, scene-config port/cascade, addon data source, NEW catalog/
  data-source/scene/host files) are read-only reference until the checkpoint
  is verified.
- No other same-line edits expected. Integration uses supervisor-directed
  reviewed cherry-picks/merge only, with vm-adversarial-merge gates; no history
  rewriting (no reset/rebase-of/delete/force/amend of any branch).

## 3. Bounded source scope (first dispatch writes ONLY B1/B3+E1/E2 paths + their tests; F/G/H paths are read-only reference; no global scans)

- `src/components/layout/viewTree.ts` (`:171-173, :346 overlay, :1697, :1835,
  :1845, :2550-2564, :2597-2603, :2670-2682, :2692`);
  `navbarFilters.svelte` (your regions only).
- `src/components/containers/explorerFiles.ts` (`:3370-3396`, `:3489-3540`;
  `:1642` wiring reference); `src/logic/logicSelectionTargets.ts:58-200`;
  `src/logic/logicNodeSelection.ts:28-62,118`.
- `src/logic/logicScopedSort.ts` (`:19, :193-197, :225-232, :393`);
  `src/logic/logicTreeGroupProjection.ts:1108,1152`;
  `src/logic/logicScopePreview.ts`; `src/logic/logicScopePick.ts`;
  `src/types/typePanelWidget.ts:114`.
- `src/logic/logicSasiRegistry.ts:95-140`; `src/types/typeInstance.ts:24-118`;
  `src/logic/logicInstanceRegistry.ts:151-158`;
  `src/logic/logicSettingsCascade.ts`; `src/logic/logicSceneConfigPort.ts`;
  `src/VaultmanFrame.svelte` (`:94, :392, :443, :472, :1642, :1691`);
  `src/components/layout/pageFilters.svelte:2006`;
  `src/logic/logicAddonDataSource.ts`;
  `src/components/containers/explorerPlugins.ts`;
  `src/logic/logicApiSceneConfig.ts`;
  `src/logic/logicFilesContextMenu.ts` (reuse ops; A1/A2 lock untouched).
- Tests: `test/unit/singleRowTooltip.test.ts`,
  `test/unit/tooltipReadyBeforeHover.test.ts`,
  `test/unit/shiftRangeSelection.test.ts`, `test/unit/nodeSelection.test.ts`,
  `test/unit/contextClickSelection.test.ts`, `test/unit/selectionTargets.test.ts`,
  `test/unit/checkboxNewAnchor.test.ts`, `test/unit/scopedSort.test.ts`,
  `test/unit/scopeLevels.test.ts`, `test/unit/treeGroupProjection.test.ts`,
  `test/unit/scopeStateResolution.test.ts`, `test/unit/scopePick.test.ts`,
  `test/unit/scopePreview.test.ts`, `test/unit/settingSceneInput.test.ts`,
  `test/unit/scopeConfigDeleteHide.test.ts`,
  `test/unit/groupSelectionTransaction.test.ts`,
  `test/unit/logicGroupPresets.test.ts`, `test/unit/sasiRegistry.test.ts`,
  `test/unit/settingsCascade.test.ts`, `test/unit/instanceRegistry.test.ts`,
  `test/unit/sceneConfigPort.test.ts`,
  `test/unit/sceneConfigMigration.test.ts`,
  `test/unit/addonDataSource.test.ts`,
  `test/unit/toolbarMenuSasiParity.test.ts`, plus NEW suites you create.
  Preserve untracked partial `test/unit/hoverTooltipOwnership.test.ts`
  (208 lines, prior tooltip attempt — see §8): NEVER overwrite; adapt using
  existing renderer tests and the production renderer. Its four reported
  failures are harness initialization errors
  (`this.containerEl.toggleClass is not a function` at `viewTree.ts:419`),
  NOT behavioral RED.

## 4. No-subdelegation rule

You are the sole substantive worker for this lane. Do NOT spawn subagents,
background workers, or lane sessions for implementation, research, or QA.
Use direct tools only. Approved model for this lane: Gemini 3.8 Flash
(antigravity) OR Muse Spark 1.3 (zen) — at most two productive workers exist
across both lanes, and a different node/worktree does NOT create provider
capacity. Live QA holds the exclusive turn (see §7).

## 5. Precise implementation steps (first dispatch ONLY B1/B3+E1/E2; each green before the next)

1. **H1/H2 separately scheduled (no F/F5 code before these exist; B/E NOT
   blocked).** H1: grouped-tree expand/collapse + scope-switch trace on the
   baseline build. H2: pick-mode open → hover preview → commit trace on
   baseline — when the drill surface is unavailable, capture the current
   gated/unsupported behavior with evidence, NEVER fabricate a
   pick-hover-commit trace. Same CDP discipline (`cdp-profile.mjs`, 1000µs
   interval, exact vault URL, one tab, scoped eval, no `obsidian-cli`). Label
   every trace with the exact surface (plugin-settings modal ≠ settingScene).
   H preparation runs on its own schedule and does NOT gate B/E frontend edits.
2. **B1 title strip.** Remove `title` (keep `aria-label`) on
   `viewTree.ts:2556-2562` hover-action buttons and your `navbarFilters.svelte`
   toolbar button titles. `tooltipsEnabledFor` gates visuals only;
   `minimalStyle`/`toolbarNodeTitle` behavior unchanged. Red-first in
   `singleRowTooltip.test.ts` (genuine behavioral red: dual `title`+
   `aria-label` under styled tooltips). Frontend contract (loaded `frontend` +
   `modern-web-guidance` skills): accessible names are the contract; no new web
   API, no decorative motion.
3. **B3 verify-only.** `viewTree.ts:2597-2603, 2672-2682` already `title`-free —
   verify, no change. **B2 stays BLOCKED** (runtime-proof gate blocks ONLY B2):
   no code on `aria-label` + `setTooltip()` without the runtime two-`.tooltip`-
   node proof or pinned Obsidian 1.13.7 source.
4. **E1/E2 checkbox parity.** Rewire ONLY `explorerFiles.ts:3370-3396` onto the
   working select-mode grammar (`:3489-3540` + `resolveCheckboxSelection`
   `:58-81` + shared policy `:111-200`): plain check toggles without clearing
   unrelated selections and moves the anchor on add; Shift extends; Ctrl/Meta
   (+Shift) follow the shared policy over `_orderedSelectableIds()`. Plain row
   open/filter/expand, range-shrink slice-replace, `NodeSelectionAxon` intents,
   and group-header exclusion untouched. Red-first (check-C-with-{A} keeps
   {A,C} anchor C; uncheck removes only target; Ctrl+Shift unions). NO E input
   is owed to F1: checkbox grammar does not produce occurrence ids.
5. Per-step: `lsp_diagnostics` clean on touched files (LSP currently unavailable
   — use `pnpm run check` + focused vitest + `git diff --check` instead and say
   so); record pre-existing failures without fixing them.
6. STOP after B1/B3+E1/E2: NO F1–F5, NO G1.0–G1.6 implementation in this
   dispatch. Await supervisor verification of the tree-interaction checkpoint.

Later-gated (documented, NOT staged): F1 identity threading (declared level
identity `ScopeResolutionNode.level: number|string`, exact-key disjoint
namespaces, numeric fallback only when no declared identity; NO E input);
F2 anchor lifecycle; F3/F4 group policies; F5 settings pick-mode port (needs H2
trace); G1.0–G1.6 staged (G1.2→G1.3→G1.5→G1.4→G1.6; G1.0/G1.1 free after lane
start; G1.0/G1.1/G1.2 preparation may parallel F units — only individual
contracts gate G1 integration; oracles 01–09 hold; no button-only downgrade).

## 6. Per-issue acceptance (first dispatch only; see matrix §4 for full contracts)

- B1/B3: no dual `title`+`aria-label` under styled tooltips (genuine behavioral
  red); names retained; B2 untouched (runtime-proof gate preserved).
- E1/E2: parity cases pass; row/open/filter/expand behavior unchanged; no
  occurrence-id output owed to F1.
- Later-gated H1/H2 (separately scheduled), F1–F5, G1: contracts retained in
  matrix §4; NO acceptance claimed and NO implementation in this dispatch.
- No performance claim without paired BEFORE/AFTER traces (protocol `11-*`).

## 7. Targeted commands

- Base: `pnpm exec vitest run --config vitest.unit.config.mts <files>`.
- Gate per step: focused suites above + `pnpm run check` + `git diff --check`.
- Live QA (exclusive turn, PC Zenless Zone `b0634b35f2c0f604`): scoped
  `ssh pc 'OBSIDIAN_HOST=http://127.0.0.1:3000 weblab-eval --vault "Zenless Zone"
  --timeout 15000 "…"'`. Never `obsidian-cli`, never switch vaults/reload/open
  tabs. One live session at a time — announce the turn, release it after.
- Never: installs, deploys (except supervisor-authorized paired-trace builds),
  commits (supervisor owns commits), plan checkbox edits.

## 8. Handoff / checkpoint order

Tree-interaction checkpoint (bounded, not global): after B1/B3+E1/E2 are green,
STOP — do not start F/G work. Before handoff: post exact diff stat,
focused-suite results, `pnpm run check` output, live oracle + paired-trace
evidence paths, and pre-existing failures observed. Supervisor verifies the
checkpoint before any F/G implementation. Integration preserves commits and
uses supervisor-directed reviewed cherry-picks/merge only, with
vm-adversarial-merge gates.

Launcher-ready (NOT launched by this doc task):
`lane run u130-polish-lane-2 /data/data/com.termux/files/home/wt/u130-row-polish /data/data/com.termux/files/home/wt/u130-c1-grouping/.omo/plans/u130-polish-1003-lane-2.md --pool antigravity`
Checkpoints and allow/deny rules are prompt instructions, not CLI flags; this
branch is already active and must not be recreated.
(via `pkmai-delegate`, finite checkpoint; at most two productive workers across
both lanes — approved models Muse Spark 1.3 (zen) / Gemini 3.8 Flash
(antigravity); a different node/worktree does NOT create provider capacity).

**Tooltip history note (do not redo blindly):** native attempt
`d_20261003_235730_2824_19729` is recorded as an UNVERIFIED TIMEOUT (log says
print timeout 30m, SUCCESS with empty response; exit 0 is not acceptance).
Conversation `49236173-4206-415e-9944-a499eef8df8f` may be resumed for a bounded
checkpoint instead of a new unbounded redo. Tracked target tree is at `f0ac41f6`
with tooltip source files untouched — the only tooltip partial is the untracked
`test/unit/hoverTooltipOwnership.test.ts`, which you must preserve and extend,
never overwrite.

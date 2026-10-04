# Lane 1 Prompt — First Dispatch: Update-Discovery Lifecycle (C3+C2/C4); C1/C5/D1–D3 Later-Gated

Ready lane prompt for ONE worker. Sibling of `.omo/plans/u130-polish-1003.md`;
full matrix in `.omo/plans/u130-polish-1003-dispatch-matrix.md` (§4 per-issue
contracts, §2 dependency taxonomy). Spec authority:
`vaultman/.agents/docs/work/performance/specs/2026-10-03-u130-polish/` shards
`01`, `04`, `05`, `09`, `11`, `12`.
Staged bounded queue: this dispatch implements ONLY C3+C2/C4. C1, C5, D1–D3
contracts are documented for later gating — NO D/C5 implementation permission
(and no C1 implementation) until the supervisor verifies the
update-lifecycle checkpoint. Bounded checkpoint, not global serialization.

## 1. Worktree ownership (reuse, never create)

- Work ONLY in `/data/data/com.termux/files/home/wt/u130-panel-content`
  (branch `fix/u130-panel-content` @ `5b26cd65`, tracked clean, verified ancestor
  of target `f0ac41f6`).
- The existing lane branch `fix/u130-polish-lane-1` is already checked out here
  at verified target `f0ac41f6` (which includes `a317da06`; never base on
  `origin/dev`). Preserve the original branch and history: do not create a
  duplicate branch, reset, rebase, delete, force, or merge `fix/u130-panel-content`.
- NEVER touch canonical `/data/data/com.termux/files/home/wt/u130` (read-only),
  NEVER select it as disposable. Do not create any worktree.
- `u130-groups-integ-0924` is reference-only (read-only precedent). Lane 2 owns
  `/data/data/com.termux/files/home/wt/u130-row-polish`; do not write there.

## 2. Collision files (yours vs Lane 2) + declared semantic conflicts

- You own these `navbarFilters.svelte` regions: `PLUGIN_UPDATE_TOOLBAR_ACTIONS`
  (`:1425-1428`), sort-menu wiring (`:4150`, later-gated C1 — do NOT implement
  now), update toolbar render (`:5025-5045`). Lane 2 owns (`:947/987/2658/
  2858/2895` scope, `:3607-3665` pick dispatch, `:4089-4093` title guard,
  `:5000-5013`).
- DECLARED OVERLAP (reconciliation tests required, landing order NOT enough):
  Lane 2's `:5030` `title={toolbarNodeTitle(translate(labelKey))}` line sits
  INSIDE your `:5025-5045` update region, and the `explorerPlugins.ts`
  badge-tooltip chain (`:379,1208-1217` → `viewTree.ts:2659`) is shared.
  Both lanes run focused reconciliation suites + `pnpm run check` +
  `git diff --check` at integration.
- No other same-line edits expected. Integration uses supervisor-directed
  reviewed cherry-picks/merge only, with vm-adversarial-merge gates; no history
  rewriting (no reset/rebase-of/delete/force/amend of any branch). If Lane 2's
  checkpoint lands first (supervisor will tell you), integrate only via the
  supervisor's directed procedure and re-run your focused suites before landing.

## 3. Bounded source scope (first dispatch writes ONLY C3/C2/C4 paths; C1/C5/D paths are read-only reference until the checkpoint is verified)

- `src/logic/logicSortMenu.ts` (`NODE_TYPE_MENU_OPTIONS` `:141-186`),
  `src/components/layout/navbarFilters.svelte` (your regions only),
  `src/components/layout/popupSort.svelte:613`.
- `src/services/servicePluginUpdates.ts` (`snapshot` `:23`, clear paths
  `:62,67,89,96`) + NEW `src/services/servicePendingUpdatesStore.ts`;
  precedent `src/services/serviceOpenedHistoryStore.ts:13-140`,
  `src/services/serviceLastOpened.ts:67`; constructor owner
  `src/main.ts:293` (`new PluginUpdatesService`) when hydration requires wiring.
- `src/components/containers/explorerPlugins.ts:379,1208-1217` and shared
  tooltip handoff `src/components/layout/viewTree.ts:2659` are writable for the
  C2/C4 target-version badge contract.
- `src/modals/modalSettingsDataTransfer.ts` (`SettingsDataPayload` `:10`,
  build/parse `:22,:39`); `src/VaultmanSettings.ts:984-1050` import callback;
  `src/services/serviceOpenedHistoryStore.ts`;
  `src/logic/logicLastOpened.ts:9-29`.
- `src/logic/logicAddonExplorer.ts` (`:16, :740-830, :1148-1158, :1255-1300`);
  `src/services/serviceSettingSearchAdapter.ts` (only if the native query needs
  the `tabId` term); `src/components/containers/explorerSnippets.ts:353,757`;
  `src/modals/modalInstanceInfo.ts:77-204` (locate, never relocate);
  `navbarFilters.svelte:39,3405-3411`.
- Tests: `test/unit/nodeTypeFilters.test.ts`,
  `test/unit/servicePluginUpdates.test.ts`, `test/unit/serializeLastOpened.test.ts`,
  `test/unit/lastOpenedPersistence.test.ts`, `test/unit/lastOpened.test.ts`,
  `test/unit/logicAddonPluginSettingsChildren.test.ts`,
  `test/unit/settingPageCache.test.ts`,
  `test/unit/serviceSettingSearchAdapter.test.ts`,
  `test/unit/toolbarAltMenus.test.ts`, `test/unit/navbarFiltersSource.test.ts`,
  plus NEW store/suite files you create for C3/D-cases.

## 4. No-subdelegation rule

You are the sole substantive worker for this lane. Do NOT spawn subagents,
background workers, or lane sessions for implementation, research, or QA.
Use direct tools only. Live QA holds the exclusive turn (see §7) — coordinate
via the supervisor, never via a second worker of your own.

## 5. Precise implementation steps (first dispatch ONLY C3+C2/C4; each green before the next)

1. **C3 pending-update cache.** NEW versioned store under
   `<configDir>/plugins/vaultman/pending-updates/` (`v1.json` + journals),
   mirroring `OpenedHistoryStore`. Discovery cache stays SEPARATE from native
   install authority (`managerFor` adapter remains authority); do NOT blindly
   remove `snapshot.clear()` in authority-map failure paths
   (`servicePluginUpdates.ts:62,67,89,96`) — retain-then-reconcile with
   installed>=pending (installed==target clears, newer supersedes per id).
   Wire hydration at construction (`main.ts:293` `new PluginUpdatesService`
   site) if needed. No C1 input required. Red-first NEW suite (restart
   rehydrates; corrupt quarantined to `pending-updates.corrupt-<ts>` keeping
   last good; offline retains; installed==target clears; newer wins). No
   journals/quarantine beyond these approved adapter necessities.
2. **C2 update-all gate + C4 target-version tooltip.** Mount `update_all_plugins`
   only when eligible pending count > 0 (badge-contract feed from C3); badge
   tooltip shows cached target version via `explorerPlugins.ts:379,1208-1217`
   → `viewTree.ts:2659`. Must not disturb sibling toolbar actions. Red-first
   (`servicePluginUpdates` + toolbar suites).
3. Per-step: `lsp_diagnostics` clean on touched files (LSP currently unavailable
   — use `pnpm run check` + focused vitest + `git diff --check` instead and say
   so); record pre-existing failures without fixing them.
4. STOP after C3+C2/C4: NO C1, NO C5, NO D1/D2/D3 implementation in this
   dispatch (contracts documented in matrix §4 for later gating). Await
   supervisor verification of the update-lifecycle checkpoint.

Later-gated (documented, NOT staged): C1 (independent menu entries, no C3
order); C5 (history-store conventions only, no C2/C4 or D input); D1→D2
(snippet substitution needs D1 identities); D3 independent of D1
(`InstanceInfoModal` `modalInstanceInfo.ts:77-204`, imported
`navbarFilters.svelte:39`, instantiated `:3405-3411` — reachability needs no
setting-page identity).

## 6. Per-issue acceptance (first dispatch only; see matrix §4 for full contracts)

- C3: reload-scoped rehydration (never restart/reopen Obsidian); corrupt
  quarantined; offline retains; target clears; newer wins; cache never claims
  install authority.
- C2/C4: hidden at 0, shown at ≥1 with versioned tooltip; siblings unaffected.
- Later-gated C1/C5/D1–D3: contracts retained in matrix §4; NO acceptance
  claimed and NO implementation in this dispatch.
- No performance claim without paired BEFORE/AFTER traces (protocol `11-*`).

## 7. Targeted commands

- Base: `pnpm exec vitest run --config vitest.unit.config.mts <files>`.
- Gate per step: focused suites above + `pnpm run check` + `git diff --check`.
- Live QA (exclusive turn, PC Zenless Zone `b0634b35f2c0f604`): scoped
  `ssh pc 'OBSIDIAN_HOST=http://127.0.0.1:3000 weblab-eval --vault "Zenless Zone"
  --timeout 15000 "…"'`. Never `obsidian-cli`, never switch vaults/reload/open
  tabs. One live session at a time — announce the turn, release it after.
- Never: installs, builds for deploy (except supervisor-authorized paired-trace
  builds), commits (supervisor owns commits), plan checkbox edits.

## 8. Handoff / checkpoint order

Update-lifecycle checkpoint (bounded, not global): after C3+C2/C4 are green,
STOP — do not start C1/C5/D work. Post the exact diff stat, focused-suite
results, `pnpm run check` output, live oracle evidence paths (scoped plugin
reload only), and any pre-existing failures observed. Supervisor verifies the
checkpoint before any D/C5 implementation. Integration preserves commits and
uses supervisor-directed reviewed cherry-picks/merge only, with
vm-adversarial-merge gates.

Launcher-ready (NOT launched by this doc task):
`lane run u130-polish-lane-1 /data/data/com.termux/files/home/wt/u130-panel-content /data/data/com.termux/files/home/wt/u130-c1-grouping/.omo/plans/u130-polish-1003-lane-1.md --pool muse13`
Checkpoints and allow/deny rules are prompt instructions, not CLI flags; this
branch is already active and must not be recreated.
(via `pkmai-delegate`, finite checkpoint; see plan Coordination Contract).

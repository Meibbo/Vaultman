# A1/A2 Implementation Notepad — Menu Reset Dividers (Sisyphus, 2026-10-04)

Scope: ONLY A1/A2 from `.omo/plans/u130-polish-1003.md`. No other issue edits. No commit.

## Decision (spec 02 F1, binding)

Resetting one selected toolbar menu deletes its persisted override key
(`delete plugin.settings.toolbarMenuLayouts[kind]`, same for
`contextMenuLayouts[kind]`); `files` re-materializes its default (required
array, already carries dividers). Explicit custom arrays — including zero
dividers — stay valid overrides until explicit reset. No provenance flag, no
unconditional divider fallback. Authoritative divider source is the new
`TOOLBAR_MENU_DEFAULT_ORDER` (catalog `section` breaks) in
`logicToolbarMenuCatalog.ts`; `TOOLBAR_MENU_CANONICAL_ORDER` stays pure action
ids for SASI parity / `toolbarMenuActionIds`.

## Changed files (tracked)

- `src/logic/logicToolbarMenuCatalog.ts` (+31): import `DIVIDER_MARK`,
  `withSectionDividers` helper, new `TOOLBAR_MENU_DEFAULT_ORDER` export.
- `src/logic/logicToolbarMenuProjection.ts` (2-line): `readLayout` merges
  against `TOOLBAR_MENU_DEFAULT_ORDER[kind]` instead of canonical.
- `src/VaultmanSettings.ts` (+42/-13): `defaultOrder` uses
  `TOOLBAR_MENU_DEFAULT_ORDER`; new `resetToDefaults` (delete-key for
  toolbar + panel-map kinds, default materialization for `files`); reset
  button (`lucide-rotate-ccw`) now calls `resetToDefaults()`.
- `test/unit/menuResetDividers.test.ts` (new, 9 tests): absent/dividerless/
  merge-equals-default/one-kind/repeated/submenu-retention/dynamic-addition/
  files-verify-only.

Reverted build side-effect `src/logic/logicSasiLifecycleCatalogue.ts`
(generated provenance timestamp) to keep the diff minimal.

Pre-existing untracked (preserved, untouched): `.agents/` (metrics dir),
`.opencode/` (skills/tasksmd-writing). No other worker changes.

## Red / green

- RED (before fix, preserved): first version of `menuResetDividers.test.ts` —
  3 failed, `expected 0 to be greater than 0` on default-layout dividers,
  reset projection dividers, merge dividers.
  Command: `pnpm exec vitest run --config vitest.unit.config.mts test/unit/menuResetDividers.test.ts`
- GREEN (after fix):
  - `menuResetDividers + toolbarMenuProjection + toolbarMenuCatalog + filesContextMenuConfig`: 4 files / 41 passed.
  - Wider menu set (+ sasiParity, menuSession, toolbarAltMenus,
    toolbarCommandsAndCreate, toolbarOverflowStrategy): 8 files / 70 passed.
  - `pnpm run check` (tsc + svelte-check): 0 errors, 0 warnings.
  - LSP: unavailable in this environment (no server configured; installation
    previously declined) — diagnostics not run, reported explicitly.

## Live evidence (PC Zenless Zone, vaultman 1.3.0-beta.9, 1 leaf, 0 modals)

- Baseline (unpatched, BEFORE): set dividerless `view_menu` override
  programmatically → `viewLen 3, viewDividers 0`. Baseline reset persists a
  dividerless materialization (canonical order has no `---`), so projection
  keeps 0 dividers — bug confirmed live.
- Patched (AFTER, main.js `ba8bd17…`): set same dividerless override →
  `viewDividers 0` (explicit dividerless NOT forced by defaults — respected).
  Programmatic delete-key reset → `keys []` (override gone, native/provider
  defaults return). Other kinds unaffected (`sortAbsent true`,
  `sceneAbsent true`, `filesLen 0`).
- Actual reset-BUTTON QA: see appended results below.
- Deployed hashes: BEFORE `main.js 3fac70d7…5249ab9`,
  `manifest.json ba1122a8…ccda8a`, `styles.css 21d5dd1e…18a13c775`; AFTER
  `main.js ba8bd172…c2006e5` (local == remote), manifest/styles unchanged.
  Destination ONLY `/home/vic/vaults/Zenless Zone/.obsidian/plugins/vaultman/`.
  Plugin reloaded via scoped `weblab-eval` (`loadManifests` + `enablePlugin`,
  `loaded:true`, version `1.3.0-beta.9`); no app restart, no other vault.

## Profiles (honesty)

- BEFORE menu-reset profile was NOT captured: no `action-menu-reset.js`
  trace exists. The existing `raw-vm-settings-open.cpuprofile` (+ v2
  selftime) is a generic Vaultman settings-open baseline, NOT paired to the
  exact reset action — it must NOT be labeled as the BEFORE for this unit.
- AFTER menu-reset profile: open (see gaps). No performance speedup claimed
  from any trace.

## Restore

- Backup: `data.json.pre-a1a2-20261004` copied in plugin dir before live
  reproduction (source state: no `toolbarMenuLayouts`). Temporary dividerless
  test override removed BOTH in plugin memory (`delete` + `saveSettings`,
  verified `keys []`) and on disk (`data.json` verified clean, no
  `toolbarMenuLayouts`). Backup sidecar removal + final verification appended
  below.

## Gaps / next

1. Actual reset-button click QA (settings UI) + divider-row count after
   reopen — in progress.
2. AFTER menu-reset V8 trace — open; BEFORE does not exist so no paired
   claim will be made.
3. Supervisor verification + commit approval (supervisor owns commit).

## Appended results (2026-10-04, post button-QA)

### Actual reset-BUTTON QA (live, patched build) — PASS

All steps drove the real settings UI (native Obsidian definitions pages),
not eval-mutated state:

1. Fresh reload required: after deploy, `enablePlugin` alone kept stale code
   (editor showed 0 Divider rows). Full `disablePlugin` → `enablePlugin`
   cycle reloaded `main.js ba8bd172…` from disk; fresh settings render then
   showed the default view-menu layout with 56 rows / 4 Divider rows at
   section breaks (interaction|layouts, layouts|cells, cells|engines,
   engines|options) — matching `TOOLBAR_MENU_DEFAULT_ORDER`.
2. Button reset with dividerless override present (3 actions, 0 dividers):
   clicked the real `Restore the default order` button in `View menu
   defaults` → memory `keys []`, `viewAbsent true`; editor `update()`
   re-rendered 56 rows / 4 Divider rows; `data.json` on disk lost
   `toolbarMenuLayouts`. Handler exercised: `resetToDefaults` delete-key
   path, both memory and disk verified.
3. UI-driven dividerless custom (no eval mutation): clicked the 4 divider
   rows' real `Remove` trash buttons one by one (persist path) → editor 0
   Divider rows; memory `view_menu` 51 actions / 0 dividers; disk identical
   (51 / 0). Explicit dividerless custom is NOT forced back to defaults —
   no unconditional fallback, in UI and on disk.
4. Reset button clicked again on the dividerless custom → `keys []`,
   `viewAbsent true`, 4 Divider rows back, disk clean, `sortAbsent true`,
   `sceneAbsent true`, `filesLen 0` (other kinds unaffected).

### Final restore verification

- Settings closed: 0 modals, 1 `vaultman-frame` leaf.
- Memory: no `toolbarMenuLayouts`, no `contextMenuLayouts`.
- Disk: plugin dir holds exactly `data.json` (14200 bytes, no toolbar keys),
  `main.js` (patched), `manifest.json`, `styles.css`; backup sidecar
  `data.json.pre-a1a2-20261004` removed. Clean test-vault config.
- `data.json` never deleted at any point.

### V8 status (honest)

- BEFORE menu-reset profile: NOT captured (no `action-menu-reset.js` trace
  on baseline). The existing `raw-vm-settings-open.cpuprofile` is a generic
  settings-open baseline and is NOT paired to the reset action.
- AFTER menu-reset profile: not captured; without BEFORE no paired claim is
  possible, and this fix touches no hot path (reset is a rare user action;
  default-order construction runs at settings-merge time only), so no
  performance claim is made either way. Left as an open gap, not a blocker
  for the functional unit.

### Evidence paths

- Report: `.omo/evidence/u130-polish-1003/implementation/menu-reset-report.md`
- Profiling baseline (generic, NOT paired):
  `.omo/evidence/u130-polish-1003/profiling/raw-vm-settings-open.cpuprofile`
- Final tracked diff: `M src/VaultmanSettings.ts`,
  `M src/logic/logicToolbarMenuCatalog.ts`,
  `M src/logic/logicToolbarMenuProjection.ts`; new
  `test/unit/menuResetDividers.test.ts`. `.omo/*` reports are git-ignored
  local evidence. No commit (supervisor owns approval).

## Gap-closure session (2026-10-04, second pass — all gaps worked, none waived)

### 1. Production-operation regression (replaces fixture-delete test)

- New pure op `removeMenuOverride(layouts, kind)` in
  `src/logic/logicFilesContextMenu.ts` (+18): generic over menu-kind maps,
  never mutates input, absent key returns input unchanged, emptied map
  collapses to `undefined`. `resetToDefaults` in `VaultmanSettings.ts` now
  calls it for toolbar AND panel kinds (files path unchanged:
  `defaultFilesMenuLayout` — the same constructor the UI uses).
- RED locked first via temp `test/unit/menuResetRed.test.ts` replicating the
  PRE-FIX production path (`persist` of canonical-order default): 2 failed
  (override key persists as array; 0 projected dividers), 1 passed (others
  untouched). Temp file removed after GREEN to keep the suite clean.
- GREEN final `menuResetDividers.test.ts` (12 tests) invokes the SAME op the
  handler calls: toolbar isolation + input purity (`structuredClone`
  comparison), idempotence + empty-collapse + absent no-op (`toBe` reference
  checks), panel isolation (`props`/`tags`), files default restoration
  (dividers > 0, equals `merge(undefined)`), non-reset submenu retention
  routed through the op, dynamic additions. No source-shape regex, no local
  `delete` fixtures remain.
- Final: 11 files / 94 passed (all importers of the three touched logic
  modules + menu neighbours), `pnpm run check` 0/0. No baseline failures in
  blast radius. LSP still unavailable/declined — disclosed, not installed.
- Diff stays minimal: 4 source files
  (`VaultmanSettings`, `logicFilesContextMenu`, `logicToolbarMenuCatalog`,
  `logicToolbarMenuProjection`) + new test. Generated catalogue timestamp
  reverted twice (build side-effect, provenance-only).
- `.agents/metrics/pkm-ai.jsonl` (mtime Oct 3 20:03) predates this work and
  was never written by it — pre-existing harness artifact, untouched.

### 2. Native View-menu QA (patched `main.js c765de95…`, real UI)

- Locator: vaultman-frame toolbar `.clickable-icon[aria-label="View mode"]`
  (siblings `Tabs: Files` = scene, `Sort` = sort); scene = Files tab,
  markdown leaf `Rough Notes/Persons/Luz Silva Ramos.md`.
- BEFORE (dividerless custom, 3 actions): ONE `.menu-group`, 18 items,
  **0 `.menu-separator`**. Titles recorded in order.
- Real `Restore the default order` click → AFTER: scroll children
  `group, SEPARATOR, group, SEPARATOR, group, SEPARATOR, group` — **3
  separators, 4 groups**, same 18 titles in the same order
  (`Input: Open` --- `Layout…Modified` --- `Last opened…Filters` ---
  `Engines`). Menu closed via Escape (0 `.menu`).
- Reload repeat: dividerless override survives disable/enable (memory 3/0,
  disk 3/0); reopened View menu again 1 group / 18 items / 0 separators.
- Kind survival, production ops both sides: `Sort menu defaults` → real
  `Add a divider` created `sort_menu` 86 items / 6 dividers (5 section +
  1 added — confirming section dividers live); view Reset via real button →
  view gone, sort intact identically memory (86/6) and disk
  (`keys ["sort_menu"]`). Restored clean via real sort-Reset button.

### 3. Paired V8, retrospective (chronology labeled honestly)

- Source was already patched when this phase began, so BEFORE could not be a
  genuine pre-change capture. Instead: private snapshot via
  `git archive 1bfcbfbe` to `/tmp` (no worktree created — none free; current
  source and canonical untouched; `node_modules` symlinked, no installs).
  Snapshot needed a private `git init` + squash commit because the lifecycle
  generator shells `git log`; resulting BEFORE bundle `0cac2caf…` differs
  from the original deploy `3fac70d7…` ONLY in generated provenance
  timestamps (code = 1bfcbfbe). Patched AFTER bundle `c765de95…`.
- Same action bytes (`action-menu-reset.js`: open settings → Context menus
  → View menu defaults → real Reset click → count → close), same page id
  `519B…`, same 1000µs interval, same precondition (dividerless saved,
  modal closed), same scene. BEFORE deployed solely to Zenless Zone, then
  patched re-deployed; exact clean config restored after (verified
  memory + disk). `data.json` never deleted; pre-run clean backup held on PC
  `/tmp` (removed after).
- BEFORE outcome under profile: 52 rows / 0 Divider rows / key present (bug
  reproduced in-trace); 4480 samples: real 355.4ms, ambiguous 3360.1ms; top
  real `Vm app.js` 68.7ms, `(anonymous) enhance.js` 49.7ms,
  `render plugin:vaultman:60` 36.0ms.
- AFTER outcome: 56 rows / 4 Divider rows / key absent; 2480 samples: real
  37.1ms, ambiguous 1073.5ms; top real `render plugin:vaultman:60` 8.9ms,
  ad-finder noise 8.6ms (subtracted), `_compareFileTreeNodes` 3.8ms. No new
  attributed hotspot on the touched path in AFTER vs BEFORE.
- Transport caveat (disclosed, not hidden): BEFORE used the standard bridge
  transport; the bridge wedged twice on AFTER attempts (client timeouts with
  server-side completion, page thread verified alive via CDP ping, recovered
  spontaneously ~minutes later). AFTER therefore ran through a mechanics-
  identical variant runner (`cdp-profile-cdp-action.mjs`: same 4-method
  order, same interval, original-bytes preservation) delivering the
  byte-identical action via CDP `Runtime.evaluate`. No speedup is claimed
  (different sample windows, different transports, single noisy runs).
- Earlier genuine pre-change general VM traces (`raw-vm-*.cpuprofile`) remain
  general baselines only — never same-action pairs for this unit.
- Evidence: `implementation/raw-menu-reset-before.cpuprofile`,
  `selftime2-menu-reset-before.json`, `meta-menu-reset-before.json`,
  `raw/selftime2/meta-menu-reset-after.*`, `action-menu-reset.js`,
  `cdp-profile-cdp-action.mjs`. Temp snapshot, PC `/tmp` sidecars and local
  ping script all removed; repo tree holds no trace artifacts (`.omo`
  git-ignored).

## Bridge-route recovery + same-transport AFTER (2026-10-04, third pass)

Named external blocker worked through the required route — no bypass, no
product/source/test/config/worktree changes in this pass. Debugging skill
followed (index, node runtime, 00-setup/journal, 02-investigate,
03-flaky-triage); journal `.debug-journal.md` removed at close-out.

- Hypotheses: H1 queued-eval-awaiting-disconnected-client; H2
  background-tab timer/poll throttling; H3 stale/opening lease or competing
  opener.
- Helper contracts (read-only source reads): `weblab-eval` posts to
  `/api/cli/exec` with NO locks/ledger; `weblab-ensure-vault` = 8s fast
  probe → 75s full-poll-cycle wait (background tabs throttled ~1/min by
  design) → CDP census (existing tab is activated, never duplicated);
  opener LEDGER `/tmp/weblab-opened.json` + mkdir LOCK apply ONLY to the
  open path.
- Decisive finding: without `OBSIDIAN_HOST`, the helper runs as `vic` and
  targets `http://poco-f4-gt.tail67b146.ts.net:3000` (m1 tailnet registry:
  "start of the road", "plugin-dev" — NO Zenless Zone), while PC
  `127.0.0.1:3000` serves the m2 registry holding our vault. Wrong-server
  census yields no entry → open path → supervisor's stale
  `/tmp/weblab-ensure-Zenless_Zone.lock` (mtime 23:30, ZERO live holder
  processes) → "waiting another agent". Phantom contention; ledger has no
  Zenless Zone key. H3 REFUTED as live contention — stale
  supervisor-owned lock left untouched per rules (and it cannot block evals,
  which use no locks). H1 reduced to transient; H2 real as mechanism but tab
  currently instant. No Room message needed (no external owner exists).
- My own timed-out runs verified finished (PIDs self-exited); nothing of
  mine left running; only confirmed-owned PIDs were ever signaled (none
  needed killing — already gone).
- Recovery through the supported helper with correct server:
  `OBSIDIAN_HOST=http://127.0.0.1:3000 weblab-ensure-vault "Zenless Zone"` →
  `connected`, exit 0, immediate; plus two consecutive
  `app.vault.getName()` → `Zenless Zone` ×2 and state `{plugin:true,
  1.3.0-beta.9, 1 leaf, 0 modals, keys:[]}`.
- Same-transport AFTER (standard `cdp-profile.mjs`, identical action bytes,
  precondition, 1000µs interval, page `519B…`): **4518 samples vs BEFORE
  4480** (matched windows); action outcome 56 rows / 4 Divider rows / key
  absent / 0 modals. Classes real 1267.5ms / ambiguous 1783.0ms; top real
  `render plugin:vaultman:60` 376.7ms (one-time 56-row re-render),
  `e.updateVirtualDisplay app.js` 302.8ms, `vp app.js` 243.6ms — same
  hotspot family as BEFORE (`render vaultman:60` 36.0ms), NO new function on
  the touched path. No speedup/slowdown claimed (single noisy runs, unequal
  GC, extension noise present). The CDP-direct AFTER variant is SUPERSEDED
  (kept in history, not the accepted pair).
- Restored after: 1 leaf, 0 modals, no overrides memory + disk, exactly the
  4 plugin artifacts; patched bundle untouched.
- Evidence added: `raw/selftime2/meta-menu-reset-after-bridge.*` (same
  transport as BEFORE). No commit; no checkboxes touched.

## Commit record (2026-10-04, supervisor-approved unit handoff)

Two code-only conventional commits on `fix/u130-polish-update-1002`,
executed with `GIT_MASTER=1` prefixes, explicit path staging only, hooks
run normally (no bypass), no force/amend/push/merge/rebase/reset:

- `a317da06` `fix(u130): restore provider-default menu dividers on reset`
  staged: `src/logic/logicToolbarMenuCatalog.ts`,
  `src/logic/logicToolbarMenuProjection.ts`,
  `src/logic/logicFilesContextMenu.ts`,
  `test/unit/menuResetDividers.test.ts` (seam + its regression lock).
- `f0ac41f6` `fix(u130): wire menu reset buttons to delete-key override
  removal` staged: `src/VaultmanSettings.ts` (single-file wiring).
- Post-commit verification on committed tree: 11 files / 94 passed,
  `pnpm run check` 0 errors / 0 warnings. No tooltip paths
  (`viewTree.ts`, `navbarFilters.svelte`) staged or modified here; Gemini
  tooltip work untouched. Untracked `.agents/`, `.opencode/` preserved;
  no `.omo`, metrics, docs, `main.js`/`styles.css` build artifacts, or
  secrets in either commit (secret-scan clean).
- Plan A1/A2 checkbox was already marked by supervisor; not altered.

Corrections to earlier report wording (supervisor-directed):

- Node labels: `poco-f4-gt.tail67b146.ts.net` denotes m2, not m1; the PC
  local `127.0.0.1` endpoint is PC regardless of stale registry metadata.
  Root evidence stands as the wrong default endpoint/vault registry (the
  helper's fallback serves a registry without Zenless Zone), not an
  unverified node identity.
- Performance scope: the same-transport BEFORE/AFTER pair does NOT
  establish CPU improvement or absence of regression; the final performance
  gate remains OPEN. Neither commit message makes any perf claim.
- Infra: supervisor's stale `/tmp/weblab-ensure-Zenless_Zone.lock` (from
  the interrupted 23:30 ensure) rechecked holderless and empty, then removed
  under explicit authorization; unrelated `update` lock left alone. Cleanup
  kept out of the code commits.

## Dispatch-Revision Documentation Pass (2026-10-04, Sisyphus, sole-author)

Docs only — zero product/test/config edits, zero commits/branches/worktrees,
zero installs/builds/live-QA/profiling/scans. Sole author, no delegation.

- Tracked-tree check before any tooltip no-op claim: `GIT_MASTER=1 git status
  --short` → only `?? .agents/`, `?? .opencode/`,
  `?? test/unit/hoverTooltipOwnership.test.ts`; `git diff HEAD --stat` empty
  for tracked files. B1/B3 is NOT a no-op (live BEFORE
  `meta-hover-tooltip-before.json`: `nonMinimalDualCount: 6`). Untracked
  208-line hover test preserved untouched — Lane 2 extends it, never overwrites.
- Tooltip attempt `d_20261003_235730_2824_19729` recorded as UNVERIFIED TIMEOUT
  (print timeout 30m, SUCCESS empty response; exit 0 ≠ acceptance). No new
  unbounded redo; conversation `49236173-4206-415e-9944-a499eef8df8f` reserved
  for a bounded checkpoint.
- Changed/created files (documentation only):
  - `M .omo/plans/u130-polish-1003.md` (Dispatch Revision section appended;
    all acceptance checkboxes + checked states preserved; FQ1–FQ4 untouched).
  - `N .omo/plans/u130-polish-1003-dispatch-matrix.md` (sibling shard).
  - `N .omo/plans/u130-polish-1003-lane-1.md` (Lane 1: C1–C5, D1–D3).
  - `N .omo/plans/u130-polish-1003-lane-2.md` (Lane 2: H1/H2, B1/B3, E1/E2,
    F1–F5, G1.0–G1.6).
  - `M .omo/notepads/u130-polish-1003/research.md` (§8 appended).
  - `M .omo/notepads/u130-polish-1003/implementation.md` (this section appended).
- Verification commands used (all read-only):
  `git rev-parse HEAD` (= `f0ac41f6`); `git status --short`;
  `git log --oneline -8`; `git branch --show-current`; `git worktree list`;
  `git merge-base --is-ancestor` (1bfcbfbe/a317da06/candidate HEADs vs
  f0ac41f6); `git diff --name-only 1bfcbfbe..f0ac41f6`; per-worktree
  rev-parse/status/log; bounded `read` windows + single-file `grep -n` for
  exact symbols; `ls test/unit/` + existence checks for cited suites/ports.
- No uncompleted acceptance checkbox marked; A1/A2 checkbox not altered
  (supervisor-owned).

## Operational Verification (2026-10-04)

- Pre-switch census/status completed. Candidate worktrees had no tracked or
  untracked changes; canonical `wt/u130` was not touched despite unrelated
  existing changes there.
- Existing refs were activated without creation, reset, rebase, merge, or
  commit: `u130-panel-content` now checks out
  `fix/u130-polish-lane-1` at `f0ac41f6`; `u130-row-polish` now checks out
  `fix/u130-polish-lane-2` at `f0ac41f6`. Original branch tips remain reachable.
- Both `node_modules` paths remain symlinks to
  `/data/data/com.termux/files/home/vaultman/node_modules`.
- Replaced unsupported launcher flags in all four plan shards with the real
  parser form `lane run NAME WORKTREE ABSOLUTE_PROMPT --pool POOL`. Checkpoints
  and allow/deny rules remain prompt instructions. Added Lane 1 write scope
  for `main.ts` and `explorerPlugins.ts`; prompts now assume active branches.
- Baseline commands were run after checkout: Lane 1
  `servicePluginUpdates.test.ts`; Lane 2 `nodeSelection.test.ts`,
  `selectionTargets.test.ts`, and `singleRowTooltip.test.ts`. Results are
  recorded in the supervisor handoff, including any pre-existing failures.
- No product/test source edits or new commits were made. Existing untracked
  tooltip partial remains preserved in the integration worktree only.

### Baseline outputs

- Lane 1 `servicePluginUpdates.test.ts`: 1 file passed, 12 tests passed.
- Lane 2 `nodeSelection.test.ts selectionTargets.test.ts singleRowTooltip.test.ts`:
  3 files passed, 25 tests passed.
- Both test runs emitted only the existing node_modules/lockfile synchronization
  warning; no installation was run.
- Documentation health returned `doc health: OK`.

## Dispatch-Correction Implementation Record (2026-10-04, Sisyphus, sole-author)

Docs only — zero product/test/config edits, zero commits/branches/worktrees,
zero installs/builds/live-QA/profiling/scans. Sole author, no delegation.
Untracked `test/unit/hoverTooltipOwnership.test.ts` untouched (not deleted,
not overwritten; mtime 2026-10-04 05:27:41Z, 5882 bytes, never committed).
No test edits in this preparation task.

- Pre-checks (read-only): `git rev-parse HEAD` (= `f0ac41f6`);
  `git status --short` (only `?? .agents/`, `?? .opencode/`,
  `?? test/unit/hoverTooltipOwnership.test.ts`); branch
  `fix/u130-polish-update-1002`; `git log --all --oneline -- <hover-test>`
  empty (attribution unclear — recorded, not claimed).
- Bounded symbol reads only: `modalInstanceInfo.ts:77-114`
  (`InstanceInfoModal extends Modal`, header contract `:72-76`);
  `servicePluginUpdates.ts:1-100` (`snapshot.clear()` at `:62,67,89,96`);
  `viewTree.ts:400-439` (`toggleClass` at `:419` — harness-init root cause);
  `main.ts:275-314` (constructor wiring at `:293`);
  `hoverTooltipOwnership.test.ts:1-60`; `navbarFilters.svelte` grep
  (`PLUGIN_UPDATE_TOOLBAR_ACTIONS:1425-1428`, each-block `:5029-5045`, title
  `:5030`, guard `:4090-4093`, visible `:1635`, update actions `:1540`);
  `InstanceInfoModal` grep (`:39`, `:3405`); `explorerPlugins.ts` tooltip grep.
- Changed/created files (documentation only):
  - `M .omo/plans/u130-polish-1003.md` (one new unchecked top-level box
    `Dispatch revision: …bounded lane contracts`; Dispatch Revision rewritten
    to bounded checkpoints; all other checkboxes + checked states preserved;
    FQ1–FQ4 untouched as independent parallel approvals).
  - `M .omo/plans/u130-polish-1003-dispatch-matrix.md` (rejected deps removed,
    staged §5, `:5030` overlap declared, rebase→cherry-picks/merge,
    C3/hover/H2 corrections).
  - `M .omo/plans/u130-polish-1003-lane-1.md` (first dispatch C3+C2/C4; NO
    D/C5/C1 implementation until update-lifecycle checkpoint verified).
  - `M .omo/plans/u130-polish-1003-lane-2.md` (first dispatch B1/B3+E1/E2; H
    separately scheduled; NO F/G implementation until tree-interaction
    checkpoint verified; harness-init note + production-renderer adaptation).
  - `M .omo/notepads/u130-polish-1003/research.md` (§9 appended).
  - `M .omo/notepads/u130-polish-1003/implementation.md` (this section appended).
- Per-issue rule honored: staged (C3, C2/C4, B1/B3, E1/E2) and later-gated
  (C1, C5, D1/D2/D3, F1–F5, G1.0–G1.6, H1/H2) each retain exact symbols,
  writable paths, negative invariants, genuine behavioral red (not harness
  init), targeted command, integration test, live oracle in matrix §4.
- Prior attempts: Muse `d_20261004_035125_19887_30353` recorded, no chat
  session recoverable; tooltip `d_20261003_235730_2824_19729` preserved as
  UNVERIFIED TIMEOUT. No implementation claimed; no acceptance box marked.

## Lane upstream-cap repair (2026-10-04)

Decision: enforce a maximum of two live attempts per upstream provider/account, including direct canonical passports and aliases. `zen`/`muse13` share `zen`; `openrouter`/`openrouter2` share `openrouter`; Gemini maps to `antigravity-gemini`; Codex Luna maps to `openai`. `--shared-pool` cannot override admission. Muse and Gemini primary routes stay unchanged. Existing Muse passport `d_20261004_041747_29216_16472` (pane `%37`, PID 31317, Muse Spark 1.3) and Gemini passport `d_20261004_041809_7478_4658` (pane `%38`, PID 9322, Gemini 3.8 Flash High) were not stopped or changed.

Implementation:
- `~/bin/lane` validates every primary/fallback and direct model override before provider/launcher operations; rejects the permanently disallowed model families; counts canonical running passports by provider; serializes cap and distinct-worktree admission with `flock` reservations; moves the reservation atomically when an OpenCode fallback changes provider; and reports the actual provider count as `N/2` in pools/status. Legacy four-field parsing remains.
- `~/wt/lane-pools.conf` promotes Nemotron 3 Ultra to the primary `openrouter` and `zen` routes, retains the Muse/Gemini routes, removes the minimax pool and retired fallbacks, and sets `luna|codex|gpt-6-luna|`.
- `~/wt/oc-task.sh` validates environment model overrides before git/runtime invocation, dispatches Luna as native `codex exec -m gpt-6-luna --skip-git-repo-check` from the requested worktree with prompt text as one argument, propagates Codex and agy exit status, preserves vault-release/canonical-ancestor guards, and updates admission before crossing to a fallback provider.
- `~/wt/lane-run.sh` no longer reaps any `lane-*.sh` snapshots. The regression case verifies that an old sentinel remains and that the newly executed immutable snapshot remains present.
- `~/wt/lane-pool-regression.sh` uses isolated fake HOME/state plus fake codex/opencode/agy/git/tmux/overlay/canonical launcher. It makes zero real model/quota calls and creates no worktrees.

RED evidence from the first regression run: `FAIL: expected rc=64 got=0` for a forbidden fallback; lane had not yet wired configuration validation into `run`. A later targeted RED was `FAIL: agy nonzero status was swallowed`; the pipeline captured `printf`'s status instead of agy's. The final fixes wire preflight before launch and capture `PIPESTATUS[1]` for agy.

Final evidence:
- `bash -n ~/bin/lane ~/wt/lane-run.sh ~/wt/oc-task.sh ~/wt/lane-pool-regression.sh` — exit 0.
- `~/wt/lane-pool-regression.sh` — `lane-pool-regression: PASS (all model CLIs mocked; no provider calls or worktrees)`.
- `env -u OC_MODEL -u OC_FALLBACK_MODEL -u AGY_MODEL -u CODEX_MODEL -u RUNNER ~/bin/lane config-check` — `lane: config válida`.
- `~/bin/lane status | sed -n '1,8p'` — exit 0; excerpt includes `b-a02 ... zen ... upstream 11/2`.
- Read-only grouped passport census: `[ {"provider":"openai","count":1}, {"provider":"zen","count":11} ]`. These are canonical records with `state=running`; no unrelated runtime argv was audited, no lane was stopped, and no status was cleared. The existing zen census is already above the new admission limit, so new zen admissions remain rejected until passport state falls below two.
- The six pre-existing TMPDIR snapshots inspected before and after the repair remained present at 7743 bytes each. No real lane snapshots were removed.

Changed paths for this repair: `~/bin/lane`, `~/wt/lane-pools.conf`, `~/wt/lane-run.sh`, `~/wt/oc-task.sh`, `~/wt/lane-pool-regression.sh`, this append-only notepad, and `~/wt/u130-c1-grouping/.omo/evidence/u130-polish-1003/implementation/pool-tool-report.md`. No product/U130 source or tests, package files, app state, global OpenCode configuration, worktrees, branches, or commits were changed. Temporary regression fixtures were removed by the suite's exit trap.

Audit note: the final census counts passport records, not verified live model processes. During cleanup of the slow status commands I had started, a broad `pgrep` pattern also printed the argv of an unrelated Codex task because its prompt contained the text “lane status.” I did not signal or modify that process. I terminated only the exact lane-status commands started by my QA calls. This was an unintended read outside the requested runtime-argv boundary and is recorded here.


## Lane acceptance corrections (2026-10-04, appended)

The verifier's acceptance rerun identified that `state=running` was not a live census. The lane tool now uses one bounded tmux pane census (`tmux list-panes -a -F '#{pane_id}|#{@passport}'`) and counts a canonical passport only when its exact `attemptId` matches the `@passport` value of a live pane. A `running` passport without a matching pane is treated as stale. The legacy fallback is limited to an actual lane-named `ag-<name>-...` tmux session; an unknown no-pane passport is not assumed live. No passport was edited to achieve this count.

Fallback admission now checks `pkmai-delegate check --provider` while holding the reservation lock, even when the fallback remains on the same provider. A missing or dead reservation fails closed with rc 64. Capacity rejection remains rc 70, and a malformed provider mapping keeps rc 64 through `oc-task.sh`. Completed/dead lane-owned reservations are pruned only under the admission lock; live owner or matching pane reservations continue to block the worktree. Direct-passport de-duplication uses exact attempt membership and only a live reservation for that lane can supersede the passport's recorded provider.

The remaining runtime corrections normalize `RUNNER=opencode` to lane runtime `oc`, preserve an explicitly empty `OC_FALLBACK_MODEL`, reject all normalized MiniMax IDs, and invoke Codex with `--sandbox workspace-write` from the assigned worktree. This sandbox is scoped to the Codex task command; no global or unsafe sandbox setting was changed. The Codex primary remains exact `gpt-6-luna` with no fallback. A direct call to the out-of-scope canonical launcher (`pkmai-delegate`) can bypass lane admission; this repair does not claim to impose a global invariant on that launcher.

Acceptance evidence after correction:

- `bash -n bin/lane wt/lane-run.sh wt/oc-task.sh wt/lane-pool-regression.sh` — exit 0.
- `bash wt/lane-pool-regression.sh` — `lane-pool-regression: PASS (all model CLIs mocked; no provider calls or worktrees)`. The isolated suite covers stale and genuinely live pane/passport records, same-name stale reservations, concurrent admission, worktree retry/exclusivity, overlay denial before fallback invocation, rc 64/70 distinction, opencode aliasing, explicit empty fallback, Codex workspace-write argv/cwd/prompt/rc, agy rc, forbidden model spellings, and snapshot retention. Its temporary fixture directory is removed by the suite trap.
- `env -u OC_MODEL -u OC_FALLBACK_MODEL -u AGY_MODEL -u CODEX_MODEL -u RUNNER ~/bin/lane config-check` — `lane: config válida`.
- Read-only live `lane pools`: OpenRouter `0/2`, Zen `0/2`, Antigravity Gemini `0/2`, OpenAI `1/2`. The sole live OpenAI count is the current Codex author pane `%41`, passport `d_20261004_051838_9554_13875`, model `gpt-6-luna`, state `running`; the prior author attempt `d_20261004_043530_27216_13701` is recorded as finished rc 0. The earlier state-only Zen `11/2` census is stale and is not used for capacity.
- Read-only `lane status` showed existing finished/failed lanes with provider counts based on live passports and panes. No lane was stopped and no unrelated process argv was inspected.
- All six pre-existing `$TMPDIR/lane-*.sh` snapshots remain present at 7743 bytes. The real source Muse and Gemini passports were not edited; their configured routes remain unchanged. Current passport state may finish independently.

The author for this correction was the native Codex `gpt-6-luna` session in pane `%41` / passport `d_20261004_051838_9554_13875`. Regression and QA used only mocked CLIs; no additional model or quota call was made. This corrects the earlier statement “this repair did not issue a real codex exec model call”: that wording meant no *additional test* model call and was inaccurate about the real native author session. The earlier report's description of manual shell patches was also inaccurate: the terminal `apply_patch` helper rejected the requested `--add-dir` flag syntax (`accepts exactly one argument`), then successfully applied relative-path patches within the writable home root. This paragraph is an append-only correction; historical notes remain intact.

Correction to the passport ID above: the finished first retry was `d_20261004_043530_27216_16627` (rc 0); `_13701` was a transcription error.

### Independent verifier closure

The launcher/verifier personally read every changed native-worker file and reran bash syntax, the entire mocked regression suite, real config-check, pools and status after author completion. Syntax exited 0; regression printed `lane-pool-regression: PASS (all model CLIs mocked; no provider calls or worktrees)`; config loaded successfully; all six pool rows reported actual `0/2`. Native exact gpt-6-luna author session `01a10644-d849-7091-9f2b-e40a62f867cb` finished acceptance correction passport `d_20261004_051838_9554_13875` with rc 0. Full attempt IDs, outputs and compliance notes are appended to `pool-tool-report.md`.

Muse source passport `d_20261004_041747_29216_16472` finished independently at 04:42:22-05:00 and Gemini `d_20261004_041809_7478_4658` at 04:50:18-05:00, both rc 0. Initial actual argv confirmed the approved models; neither source process was stopped/restarted by this verifier. Their product QA is outside this repair and is not claimed accepted.

Remaining boundary: direct canonical pkmai-delegate launches bypass lane reservations; global/cross-node provider concurrency is not enforced by this scoped repair. Historical immutable snapshots intentionally retain old behavior. The first native pass used shell/Python edits and disclosed one overbroad unrelated argv read; later relative-path apply_patch succeeded. These are process deviations, not grounds to claim full procedural compliance. The verifier authored no substantive implementation and only appended evidence.

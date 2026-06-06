---
title: Current handoff
type: agent-handoff
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
archive_source: docs/archive/pkm-ai/active-docs/2026-05-11T080321-current-handoff.md
created: 2026-05-04T01:36:20
updated: 2026-06-06T12:20:12
tags:
  - agent/current
created_by: dec
updated_by: codex-gpt-5
---

# Current Handoff

Compact handoff after archiving the oversized current handoff:
[[docs/archive/pkm-ai/active-docs/2026-05-11T080321-current-handoff|2026-05-11 handoff archive]].

## NEXT AGENT START HERE — SDF-015 queue guard complete (2026-06-06)

Stable `1.1.0` Data/Files parity
[[docs/work/hardening/issues/stable-1-1-data-files-parity/015-queue-duplicate-contradictory-operation-guards|SDF-015]]
is complete in product worktree `hotfix/1.0.2-css-scorecard`. The stable queue remains the existing
`PendingChange[]` service, but `OperationQueueService.add`, `addBatch`, and bypass `addOrRun` now
share a semantic gate. Exact duplicates are skipped, same-operation partial target overlap merges
missing files into the existing queued op, property/tag/file contradictions on overlapping files are
blocked, action presets pass through the same policy, and bypass does not execute an immediate
operation that conflicts with pending staged work. Sandbox research found that `origin/sandbox` uses a
larger VFS/transaction queue (`serviceQueue.svelte.ts`) with node-bound delete-conflict purge; this
wave intentionally ported the stable-compatible policy, not the full architecture. Evidence:
new RED/GREEN `operationQueueConflictPolicy.test.ts`, focused queue/template tests passed, `pnpm run
verify` passed (`19` unit files / `66` tests; scorecard `17` checks), build synced to `plugin-dev`,
reload/open passed, runtime smoke confirmed duplicate skip, target merge, contradiction block, bypass
`processFrontMatter` calls `0`, queue cleanup, and final `dev:errors` returned `No errors captured`.

## NEXT AGENT START HERE — Dock tooltip/active-state fix complete + SDF-016 added (2026-06-06)

Stable `1.1.0` Data/Files parity dock follow-up is complete in product worktree
`hotfix/1.0.2-css-scorecard`. `navbarPillFab.svelte` no longer emits native `title` attributes on
dock FABs, preventing duplicate tooltip surfaces when Obsidian also uses `aria-label`. `VaultmanFrame`
passes `queueIslandOpen` / `filtersIslandOpen` into `BottomNav`, and the dock FABs now get
`is-active` while their matching islands are open. Minimal dock CSS now gives page buttons a squarer
`var(--radius-s)` hover/active shape and keeps dock FAB hover/active states round. Added
[[docs/work/hardening/issues/stable-1-1-data-files-parity/016-explorer-view-parity-and-stat-card-routing|SDF-016]]
for future all-explorer table view parity, Files grid view, and Statistics-card routing into Data
tabs. Evidence: Svelte autofixer on `navbarPillFab.svelte` and `VaultmanFrame.svelte` reported no
issues; focused source guard `navbarPillFabSource.test.ts` passed; `pnpm run verify` passed
(`18` unit files / `59` tests; scorecard `17` checks); build synced to `plugin-dev`; reload passed;
DOM smoke confirmed no dock FAB `title`, page button radius `4px`, dock FAB radius `50%`, queue and
filters FABs becoming `is-active` while islands are open, and final `dev:errors` returned
`No errors captured`.

## NEXT AGENT START HERE — SDF-014 Data tab switching complete (2026-06-06)

Stable `1.1.0` Data/Files parity
[[docs/work/hardening/issues/stable-1-1-data-files-parity/014-data-tab-switch-performance-and-offset-regression|SDF-014]]
is complete in product worktree `hotfix/1.0.2-css-scorecard`. `pageFilters.svelte` now keeps visited
Data tab panes mounted, removed the keyed in-flow `fade` transition, and passes Props/Tags their own
per-tab search values. Files/Props/Tags explorer setters now return early when view mode, visible
cells, sort state, or search state are unchanged, stopping repeated header effects from forcing
redundant renders. Runtime smoke after the final fix reported `maxPaneCount=4`,
`maxActivePaneCount=1`, `maxTopDelta=0`, only `2` tree render actions, and sampler samples
`46/56/57/60/60 fps`; native workspace-tab reference in the same `plugin-dev` session reported
`56/60 fps`, `0` long tasks, and `maxTopDelta=0`. Evidence: Svelte autofixer on
`pageFilters.svelte`, focused source-guard tests (`2` files / `6` tests), `pnpm run verify` passed
(`17` unit files / `56` tests; scorecard `17` checks), final build synced to `plugin-dev`, reload
passed, and fresh `dev:errors` returned `No errors captured`.

## NEXT AGENT START HERE — New SDF-013/SDF-014/SDF-015 follow-ups added (2026-06-06)

Three new Stable `1.1.0` Data/Files parity issues were added to
[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]:
[[docs/work/hardening/issues/stable-1-1-data-files-parity/013-empty-folder-caret-and-extension-icons|SDF-013]]
for empty-folder caret affordance plus extension-aware file icons;
[[docs/work/hardening/issues/stable-1-1-data-files-parity/014-data-tab-switch-performance-and-offset-regression|SDF-014]]
for sampler-backed Data tab switch FPS and vertical-offset regression diagnosis; and
[[docs/work/hardening/issues/stable-1-1-data-files-parity/015-queue-duplicate-contradictory-operation-guards|SDF-015]]
for duplicate/contradictory queue-operation guards researched against sandbox. SDF-014 is now
completed; SDF-015 must still start with runtime/sandbox research before coding.

## NEXT AGENT START HERE — SDF-012 Data Files tab menu cut complete (2026-06-06)

Stable `1.1.0` Data/Files parity issue
[[docs/work/hardening/issues/stable-1-1-data-files-parity/012-data-files-tab-menu-and-filter-fab-clear|SDF-012]]
is done in product worktree `hotfix/1.0.2-css-scorecard`. Files is no longer a bottom-dock page;
the dock is Data + Statistics and old `ops` page-order settings normalize through
`src/logic/logicNavigation.ts`. Files is now the first Data header Tabs menu option and still uses
the existing `FilesExplorerPanel` via `FilesTab`. The active-filters FAB supports double-click clear,
filters header padding is `8px`, and Statistics scope pills use `--scope-color` values from the stats
grid palette. Evidence: focused RED/GREEN navigation/default tests, `pnpm run verify` passed, final
build synced to `plugin-dev`, plugin reload passed, fresh `dev:errors` returned `No errors captured`,
DOM smokes confirmed dock labels `Data`/`Statistics`, Tabs order `Files/Props/Tags/Content`, Files
visible inside Data, double-click active-filter clear, and Statistics scope pill color variables.

## NEXT AGENT START HERE — Stable Data/Files parity follow-up issue set (2026-06-06)

The next release-facing work is now tracked as
[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]].
SDF-001 and SDF-002 are completed and verified in product worktree `hotfix/1.0.2-css-scorecard`.
Next recommended wave: SDF-006 and SDF-009 for remaining small visible UX fixes, then SDF-003 before
SDF-004/SDF-005. SDF-010 still requires Core Search research with `obsidian-cli` and
`obsidian-web-lab`; SDF-011 still requires Bases table screenshot/DOM research. Latest verification
for SDF-001/SDF-002: `pnpm run verify` passed, build synced to `plugin-dev`, plugin reload passed,
fresh `dev:errors` returned `No errors captured`, Files DOM showed `.base`/`.png`
`.vaultman-tree-type.nav-file-tag` with `.md` hidden, and Files/Props expansion changed headers to
`Collapse all` before collapsing them again.

## NEXT AGENT START HERE — Stable Data/Files parity extension/search/filter pass (2026-06-06)

Continue from
[[docs/work/hardening/plans/2026-06-05-stable-1-1-0-data-files-parity/index|Stable 1.1.0 Data/Files parity plan]],
Task 6L. Latest cut: Files extension display moved from ad-hoc badges into the same row cell model as
Props node types (`TreeNode.typeText` rendered by `.vaultman-tree-type`), so `.md`, `.base`, `.png`,
and other extensions appear as the node type/ext cell when enabled. Props `property names` search now
returns only property nodes; value/level-2 rows are reserved for `all property text`. The
expand/collapse header button derives its label from the active explorer's real expanded-node state,
so one or more expanded rows shows `Collapse all`. Files active filters/search no longer pass the full
vault folder list into the tree projection, preventing unrelated empty folders from rendering under
constraints; sparse filtered results auto-expand level-1 folders when fewer than four top-level folders
are visible, while a manual collapse stays collapsed until the result signature changes. Content search
preview lifted the old ten-file visual cap to a high DOM-safety cap and keeps `matchedFiles`
uncapped. Evidence: focused unit tests passed, `pnpm run verify` passed, final build synced to
`plugin-dev`, `plugin:reload` passed, `dev:errors` returned `No errors captured`, and CLI DOM smokes
covered filtered Files rows/extensions, manual collapse persistence, Props `banner` property-name mode,
and Content `journal` preview without the old `and N more files` normal cap. Test filters were cleared
from `plugin-dev` after smokes.

Prior Task 6K context:
Task 6K. Latest cut: minimal filters header centering now matches the native File Explorer header
because Vaultman uses Obsidian's plural `.nav-buttons-container` behavior without overriding it to
`flex-start`; CLI measured the active Vaultman header as `justify-content:center`. Explorer search
state is now per surface (`props`, `tags`, `files`), so Props/Tags search text stays on Data and does
not create accidental Files `file_name contains ...` filters. Props search calls the existing
`PropsLogic.expansionIdsForSearchMatches()` on search changes, so level-2/value matches such as
`journal` expand their parents while parent-only matches still do not force irrelevant children.
Content search no longer opens the core Search pane when none exists, avoiding focus/leaf steal; with
core Search enabled and present, CLI smoke kept the active leaf and focus on Vaultman while typing.
Settings now renders `Filter templates` and a separate `Action presets` section for saved staged
operations. Evidence: `pnpm run verify` passed; final build synced to `plugin-dev`; `plugin:reload`,
`dev:errors`, header DOM/CSS, Props `journal` DOM, Files search-bleed DOM, Content focus DOM, and
Settings DOM smokes passed.

Prior Task 6I/6J context:
Task 6I. Completed this cut: proto design v12's tabs-as-chip idea was reshaped into a minimal
Data-header `Tabs` button that opens an Obsidian `Menu` with Props/Tags/Content; the visual tabbar is
hidden only in minimal style, and Content keeps the Tabs button so the user cannot get trapped there.
Header order on Data explorer tabs is `Tabs -> View mode -> Sort -> Search -> Auto-reveal when Files
surface exists -> Expand/Collapse`; page Files keeps `View -> Sort -> Search -> Auto-reveal ->
Expand/Collapse` because it has no Data tabs. Props now uses `lucide-archive`; `main.ts` was verified
already using `lucide-vault`, with no `lucide-cupcake` remaining in `src`. Minimal dock active icons
now use Obsidian sidebar active contrast (`workspace-tab-header tappable is-active`, hover background,
tab active color, no accent halo). Files tree extension badges now show any extension when the `ext`
cell is enabled, including `.md` and `.base`.

Evidence: `pnpm run verify` passed; `pnpm run build` synced to `plugin-dev`. The Obsidian CLI bridge
initially timed out; stale `Obsidian.com` processes were cleared and Obsidian was restarted via
`Obsidian.exe obsidian://open?vault=plugin-dev`. After that, `plugin:reload` passed and
`dev:errors` returned `No errors captured`. CLI DOM smoke confirmed no minimal Data tabbar, Tabs menu
items `Props/Tags/Content`, Content state still exposing only `Tabs: Content`, active dock style
matching the active Obsidian sidebar tab (`rgba(255,255,255,0.067)`, `rgb(179,179,179)`, no shadow),
Files tree badges including `.base`, `.md`, and `.png`, and `.base` Files search showing base files
with `.base` badges. Residual: Files table switch still produced one earlier `868 ms` long-task
sample, and Props expand-all still has model/projection cost.

Task 6J follow-up: the minimal filters header now also carries Obsidian's real
`nav-buttons-container` class while each action remains `clickable-icon nav-action-button`.
CLI DOM measured the header as 26px high with `gap: 2px`, and each button as 30x26 with an 18x18
centered icon. A Files scroll regression was reproduced: the virtual viewport had scrollable content
but computed `overflow-y: hidden` because an old scoped Svelte rule
`.vaultman-files-tab-content.svelte-1iho35x { overflow: hidden; }` could persist after reload. The
product source removed that scoped overflow and `styles.css` now has a higher-specificity override
only for `.vaultman-files-tab-content.vaultman-tree-virtual-viewport` inside Vaultman leaves. Fresh
smoke after reload showed `overflowY: auto`, `scrollTop` moving `0 -> 1057`, and `canScroll: true`.
`pnpm run verify` passed again after the follow-up.

## NEXT AGENT START HERE — Feature grill checkpoint closed (2026-05-29)

Read [[docs/current/2026-05-29-checkpoint|2026-05-29 checkpoint]] first. It links the dev-facing pending-question item and Mermaid map; S-26 is locked, next grill = S-27 panelData.

## NEXT AGENT START HERE — Architecture + Style + Version-streams grill closed (2026-05-27)

Three-day grill (2026-05-25→27) closed the architecture foundation, mapped proto design, and
defined the version-stream flow. Health-clean (decision-ledger soft-WARN at 204 lines — shard or leave).

**Read via these hubs (each links its full-detail records):**
- [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/index|Architecture Foundation Discovery]]
  → decision-ledger + **[[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/decision-changelog|decision-changelog]]**
  (read this first — what changed + why) + research-streams + roadmap-reslot +
  **[[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/roadmap-dispatch|roadmap-dispatch]]**
  (live action order; NOTE gaps: Style/Theme + Kbd/API/NN not yet slotted).
- [[docs/architecture/explorer-model/index|explorer-model]] → 4 shards (responsibility-map · render-data ·
  surfaces-interaction · panels-axons-mutation-layout) + [[docs/architecture/adr/README|ADRs 0001–0008 all Accepted]] + glossary.
- [[docs/work/hardening/research/2026-05-26-style-source-reconciliation/index|style-source-reconciliation]]
  (+ proto-v6-sidebar-map; islands = Scenes; FiltersIsland→logicProps/Tags, FnR→logicFnR*).
- [[docs/work/hardening/research/2026-05-27-version-streams-distillation/index|version-streams]]
  (5 streams; main=stable/dev=beta/sandbox=canary; flow discipline; pre-release labels OPEN).
- [[docs/work/pkm-ai/items/2026-05-27-agent-memory-routing-upgrade|pkm-ai memory-routing item]] (cross-session memory gap).

**Next**: (1) hand [[docs/work/publish/index|publish]] to a dedicated agent (stable = v1.0.0-continuation
reconcile + branch/channel mechanics + tag labels + the mis-release fix); (2) **proto design integration
grill** (own session; proto v7 ships 2026-05-28; classify ADOPT/RESHAPE/MAP/ADD/FIX/DROP/DEFER/SUPERSEDE;
map snapshots, do not chase); (3) complete the unified roadmap (fold Style/Theme + Kbd/API/NN into
roadmap-dispatch); (4) then NOW-tier SPEC→PLAN→Issues — logic-extraction (proto FiltersIsland → logicProps/Tags,
FnR island → logicFnR*), PlatformAdapter. Gated on dev greenlight.

**2026-05-28 — full wave checkpoint** (post-2026-05-27 architecture + Bases hybrid + storage recon + DnD
design + identity + tooling). All detail sharded into
[[docs/current/2026-05-28-checkpoint|2026-05-28 checkpoint]]: wave summary, the 8 new architecture
surfaces (`zoom-out-map` · `dev-glossary` · `operational-watch-list` · `research-inventory` ·
`pending-decisions` · `tooling-libraries` · `vaultman-identity` + ADR 0009 / 0001–0009), the dev-blocked
decisions S-1..S-11, the open research backlog, and the **copy-pasteable starter prompt** for the next
chat (feature-request evaluation + publish/commit/branch/release discipline). Fresh agents read:
AGENTS.md → start.md → status.md → handoff.md → 2026-05-28-checkpoint.md.

**Opens / parking-lot / deferred** (full consolidated review:
[[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/open-inventory|open-inventory]]):
preset taxonomy ·
serviceUnload/load-preset = USER-FACING granularity (NOT publish) · serviceMark god-object ·
LayoutBuilder/Workspace-profiles · style row 7 (selection color) · ActionNode refinements · islands
large-surface · branch 3 deferred (minisearch H1 + Bases interop order). Proto design path:
`C:\Users\vic_A\Downloads\vaultman`. Researches done: roadmap-methodology + branch-workflow (folded into their docs).

## Superseded — V.D Tree render projection + sibling specs (2026-05-25)

Folded into the 2026-05-27 architecture work above (render-runtime / projection = ADR 0008; media /
icon caches = roadmap-dispatch lane C). Source records still valid:
[[docs/work/hardening/research/2026-05-25-vd-tree-list-nn-pipeline-discovery/index|V.D pipeline discovery]] ·
[[docs/work/hardening/specs/2026-05-25-vd-tree-render-projection/index|V.D Tree Render Projection]] ·
[[docs/work/hardening/specs/2026-05-25-explorer-node-media-cache/index|node media cache]] ·
[[docs/work/hardening/specs/2026-05-25-explorer-node-video-provider-media-cache/index|video provider cache]] ·
[[docs/work/hardening/specs/2026-05-25-explorer-icon-pack-cache/index|icon pack cache]].

The exact handoff + status text removed in the 2026-05-27 checkpoint (the prior 2026-05-26 + 2026-05-25
sections) is preserved verbatim:
[[docs/archive/pkm-ai/active-docs/2026-05-27T000000-handoff-status-superseded-sections|2026-05-27 superseded sections archive]].

## Previous Handoff — A.R complete / 0-A.S scroll follow-up (2026-05-20)

**Release/main reconciliation is complete.** Full source record:
[[docs/work/hardening/plans/2026-05-20-release-1-1-0-catch-up|Release 1.1.0 catch-up]].

**Facts to carry forward**:
- `origin/main` = `7886d58abc596bd21f98776ddf9804be7c3a2889`.
- Release tag `1.1.0` = `8d5c4fd61a6e1840cb74e8523ca46312f20936ec`.
- GitHub Release: `https://github.com/Meibbo/Vaultman/releases/tag/1.1.0`.
- Release assets published: `main.js`, `manifest.json`, `styles.css`, `SHA256SUMS`, `sbom.cdx.json`.
- `release-please` is installed on `main` with bare tags (`include-v-in-tag: false`) and
  `manifest.json` / `versions.json` extra-files.
- `release.yml` triggers on bare `X.Y.Z` tags and publishes release assets, SBOM, checksums, and
  attestations.
- `ci.yml` includes `sandbox` triggers and an AI-file guard for PRs to `main`.
- `main` must remain zero-AI-files: no `AGENTS.md`, `CLAUDE.md`, `.agents/`, `.claude/`, `.codex/`.

**Verification**:
- Clean candidate `pnpm run verify`: exit 0.
- Clean candidate `pnpm run security:audit`: exit 0 for high+ threshold.
- PR #20, PR #21, and PR #22 completed the release infra, release PR, and Scorecard fix sequence.
- Main after PR #22 passed CI, CodeQL, and OpenSSF Scorecard.
- Dependabot security alerts on default branch were fixed or auto-dismissed after main replacement.

**Current release numbering**:
- `1.1.0` = completed catch-up release only.
- Umbrella feature pipeline starts at `v1.2.0`.
- Explorer Hardening = `v1.2.0`.
- Architecture cleanup = `v1.3.0`.
- Keyboard + Public API = `v1.4.0`.
- Nautilus rewrites = `v1.5.0`.
- Theme Builder + Layout = `v1.6.0`.
- Design system migration = `v1.7.0`.
- NN Interop = `v1.8.0`.
- Bases Parity remains `v2.0.0`.

**Next action**:
1. A.R spec + implementation plan are imported to `sandbox`.
2. Gate-0 and Tasks 1-9 are complete, through Task 9 verification matrix + live smoke.
3. Current active follow-up is 0-A.S scroll harness: view switching,
   percentile/histogram reporting, `--vault=<name>`, and active Files-surface
   targeting are done. 50k Tree/List/Table Files matrix passed with zero
   blanks; Grid/Cards are collapsed-topology only, and 100k is blocked by
   Obsidian CLI/runtime readiness.

**Optional cleanup**:
- Remote branches `main-clean-1.1.0` and `release/1.1.0-infra` are merged/stale branches created
  for the release work. Delete only when the user wants branch cleanup.

## Resume Point

- Worktree: `C:\Users\vic_A\Desktop\vaultman`
- Branch: `sandbox`.
- **Latest (2026-05-20)**: 0-A.S stress-vault scroll matrix progressed in the
  variable scroll repair record:
  [[docs/work/hardening/plans/2026-05-16-explorer-variable-scroll-repair/2026-05-20-stress-vault-matrix|0-A.S stress-vault scroll matrix]].
  Harness fix: runner now defaults to `--surface=files`, and perf probe ignores
  inactive matching tab containers. Fresh local gate passed: targeted Vitest
  3 files / 33 tests; `pnpm run check`; `pnpm run lint`; `pnpm run build`;
  `git diff --check` with LF-to-CRLF warnings only. 50k Tree/List/Table Files
  matrix passed with zero blank frames and no Obsidian dev errors; Grid/Cards
  still need expanded-row coverage. 100k corpus exists locally, but basic
  `stress-vault` eval timed out after 5 minutes and earlier reload/index
  polling also timed out.
- Previous (2026-05-20): A.R Task 9 complete and verified locally.
  Task 9 source record:
  [[docs/work/hardening/plans/2026-05-20-explorer-AR-action-routing/05-verification|Task 9 verification matrix + live smoke]].
  Added keyboard-nav parity and structural-attribute anti-drift tests across
  Tree/List/Table/Grid/Cards; `pnpm run verify` passed with lint/check/build,
  unit 148 files / 953 tests, and component 114 files / 543 tests. Live
  `plugin-dev` explicit-switch scroll smokes passed for Tree/List/Table/Grid/Cards
  with zero blank frames and final `dev:errors` returned `No errors captured.`
- Previous (2026-05-20): A.R Task 8 complete and verified locally.
  Task 8 source record:
  [[docs/work/hardening/plans/2026-05-20-explorer-AR-action-routing/04-expand-and-cmenu|Task 8 cmenu trigger + standard set]].
  Trigger/standard-set gate: 2 files / 11 tests; expanded provider cmenu gate:
  7 files / 79 tests; `pnpm run check` and `pnpm run lint` passed with
  0 errors / 0 warnings.
- Previous (2026-05-20): A.R Task 7 complete and verified locally.
  Task 7 source record:
  [[docs/work/hardening/plans/2026-05-20-explorer-AR-action-routing/04-expand-and-cmenu|Task 7 expand/collapse-all data-gated]].
  Focused expand-all gate: 1 file / 2 tests; panel/grid regression gate:
  3 files / 67 tests; `pnpm run check` and `pnpm run lint` passed with
  0 errors / 0 warnings.
- Previous (2026-05-20): A.R Task 6d complete and verified locally.
  Task 6d source record:
  [[docs/work/hardening/plans/2026-05-20-explorer-AR-action-routing/03-view-adoption-task-6d-cards|Task 6d ViewNodeCards adoption]].
  Action-adoption gate: 1 file / 4 tests; expanded cards/panel gate:
  9 files / 70 tests; `pnpm run check` and `pnpm run lint` passed with
  0 errors / 0 warnings.
- Previous (2026-05-20): A.R Task 6c complete and verified locally.
  Task 6c source record:
  [[docs/work/hardening/plans/2026-05-20-explorer-AR-action-routing/03-view-adoption-task-6c-grid|Task 6c ViewNodeGrid adoption]].
  Focused grid/delegation gate: 4 files / 33 tests; expanded grid/panel gate:
  9 files / 84 tests; `pnpm run check` and `pnpm run lint` passed with
  0 errors / 0 warnings.
- Previous (2026-05-20): A.R Task 6b complete and verified locally.
  Task 6b source record:
  [[docs/work/hardening/plans/2026-05-20-explorer-AR-action-routing/03-view-adoption-task-6b-table|Task 6b ViewNodeTable adoption]].
  Focused table gate: 8 files / 25 tests; panel/delegation gate: 2 files / 50 tests;
  `pnpm run check` and `pnpm run lint` passed with 0 errors / 0 warnings.
- Previous (2026-05-20): A.R Task 6a complete and verified locally.
  Task 6a source record:
  [[docs/work/hardening/plans/2026-05-20-explorer-AR-action-routing/03-view-adoption-task-6a-tree|Task 6a viewTree adoption]].
  Focused gate: 3 files / 24 tests; `pnpm run check` and `pnpm run lint` passed with 0 errors / 0 warnings.
- Previous (2026-05-20): A.R Tasks 1-5 complete and verified locally.
  Task 5 source record:
  [[docs/work/hardening/plans/2026-05-20-explorer-AR-action-routing/02-seam-normalization|Task 5 seam normalization]].
  Focused gate: 9 files / 112 tests; `pnpm run check` and `pnpm run lint` passed with 0 errors / 0 warnings.
- Previous (2026-05-20): 0-A C12/C13 closeout complete and verified locally; A.R Gate-0 is closed/unblocked.
  Evidence:
  [[docs/work/hardening/plans/2026-05-18-explorer-sub-system-0-a-native-dom-parity/baseline-log|0-A baseline log]].
  Release 1.1.0 catch-up complete, umbrella pipeline renumerado, and
  A.R spec/plan imported from `claude/pensive-khorana-ed62bd`.
  [[docs/work/hardening/specs/2026-05-19-explorer-merge-umbrella/index|Explorer Merge Umbrella]]
  (index + 6 shards). Pipeline `v1.2.0→v2.0.0`; next: A.R implementation.
- Latest request handled: Explorer Phase 0 sub-system O
  (`frameVaultman.svelte` decomposition) implemented inline across six serial
  commits on `sandbox`.
- Explorer platform pass Tasks 1-20 are complete.
- Post-review repair is implemented but not yet committed: Notebook Navigator
  comparison bridge, 50K projection optimization, and Markmap hidden from the
  selectable view menu.
- Primary records:
  - [[docs/work/hardening/plans/2026-05-20-release-1-1-0-catch-up|Release 1.1.0 catch-up]]
  - [[docs/work/hardening/specs/2026-05-19-explorer-merge-umbrella/index|Explorer Merge Umbrella]]
  - [[docs/work/hardening/specs/2026-05-20-explorer-AR-action-routing/index|A.R Action Routing spec]]
  - [[docs/work/hardening/plans/2026-05-20-explorer-AR-action-routing/index|A.R implementation plan]]
  - [[docs/work/hardening/specs/2026-05-15-explorer-view-platform-pass/index|Explorer View Platform pass spec]]
  - [[docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/index|Explorer View Platform pass implementation plan]]
  - [[docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/perf-baseline|Explorer View Platform perf baseline]]
  - [[docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/07-performance-comparison-repair|Explorer platform performance comparison repair]]
  - [[docs/work/hardening/specs/2026-05-16-notebook-navigator-scroll-forensics/index|Notebook Navigator scroll forensics]]
  - [[docs/work/hardening/research/2026-05-16-multiview-virtualization-research/index|Multiview virtualization research]]
  - [[docs/work/hardening/plans/2026-05-16-explorer-scroll-smoke-harness/index|Explorer scroll smoke harness implementation plan]]
  - [[docs/work/hardening/plans/2026-05-16-explorer-variable-scroll-repair/index|Explorer variable scroll repair]]
  - [[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/index|Explorer 0-B serviceTheme token-layer spec]]
  - [[docs/work/hardening/plans/2026-05-15-explorer-0-b-servicetheme-token-layer/index|Explorer 0-B executed implementation plan]]
  - [[docs/work/hardening/specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/index|Explorer Sub-system O spec]]
  - [[docs/work/hardening/plans/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/index|Explorer Sub-system O executed implementation plan]]
  - [[docs/work/hardening/specs/2026-05-18-explorer-sub-system-0-a-native-dom-parity/index|Explorer Sub-system 0-A spec]]
  - [[docs/work/hardening/plans/2026-05-18-explorer-sub-system-0-a-native-dom-parity/index|Explorer Sub-system 0-A executed implementation plan]]
- Preserve any unrelated dirty files if they appear later. At the time of this
  handoff, `git status --short --branch` showed only the active variable scroll
  repair files and docs.
- Toolbar architecture research captured at
  [[docs/work/polish/research/2026-05-17-toolbar-architecture/index|Toolbar architecture and primitive ordering map]];
  it explains why the current toolbar is Filters-page-specific and how to move
  toward tab-agnostic primitive ordering through a model resolver plus adapters.
- Codebase architecture cluster phases 01-09 are captured at
  [[docs/work/research/2026-05-17-codebase-architecture-cluster/index|Codebase architecture cluster]].
  Latest completed layer:
  [[docs/work/research/2026-05-17-codebase-architecture-cluster/09-residual-src-support-layer|Residual src support layer]].

## Historical Records

Detailed commits and verification live in the source records linked above, especially the Explorer
View Platform pass, Explorer platform performance repair, 0-B plan, O plan, and variable scroll
repair. Current handoff keeps only the active route and the latest release facts.

## Preserve

- Obsidian CLI calls must use an explicit `vault=<name>` command option. Normal
  live smokes default to `plugin-dev`; the 50k/100k matrix should use the new
  runner `--vault=<registered-stress-vault>` option instead of relying on the
  focused vault.
- Do not use generic Obsidian commands that fall back to the active vault.
- The registered `stress-vault` is intentionally not marked open in
  `%APPDATA%\obsidian\obsidian.json` after the 100k readiness hang. Backup made
  before registration:
  `C:\Users\vic_A\AppData\Roaming\obsidian\obsidian.json.vaultman-stress-backup-20260520192758.json`.
- Keep Map/ViewNodeMap deferred and not selectable.
- Keep media/image disabled by default in every view.
- Keep `main` free of AI workflow files.

## Dirty Worktree Notes

- Before Sub-system O started in this session, unrelated untracked files were
  already present and preserved: `.agents/brain/`, `eslint-rules/`,
  `img/vaultman-screenshot.png`, and `scripts/esbuild.config.mjs`.
- After the 0-B commits, unrelated dirty files still existed and were preserved:
  toolbar/polish agent docs and metrics, `src/main.ts` ribbon icon work,
  `src/types/typeFrame.ts`, and `src/types/typeTabLeaf.ts`.
- The 0-A C12/C13 closeout handoff commit is scoped to
  `scripts/run-explorer-scroll-smoke.mjs`, `src/dev/perfProbe.ts`,
  perf probe/script/performance tests, restored `PopupIslandChild.svelte`, and
  linked hardening/current docs.

## Next Action

- **PRIMARY (post A.R Task 9 2026-05-20)**: continue 0-A.S from
  [[docs/work/hardening/plans/2026-05-16-explorer-variable-scroll-repair/2026-05-20-stress-vault-matrix|0-A.S stress-vault scroll matrix]]
  by adding fine-grained timing marks around Tree visible-row work, List row
  projection, and Grid expansion/render readiness.
- Phase 0 spine `0-H → 0-B → O → 0-A` and A.R are closed.
- If continuing Explorer scroll work, start from the variable scroll repair
  record. The blank fallback bug is repaired for the live selectable modes and
  Table/Grid active-scroll measurement is now deferred. Runner-level view
  switching, percentile/histogram delay reporting, `--vault` selection, and
  active Files-surface targeting are done. Next target: marks for the valid 50k
  pressure points plus a separate 100k launch/index readiness gate before
  retrying scroll bursts.
- Live scroll smoke harness implemented and verified:
  `pnpm smoke:scroll -- --view=tree --jumps=100`.
  Stress command: `pnpm smoke:scroll:stress -- --view=tree`.
  Both route through `scripts/run-explorer-scroll-smoke.mjs`; default vault is
  `plugin-dev`, and `--vault=<name>` overrides it for stress-vault runs.
- Latest live tree result: `blankFrames=0`, `blank>100ms=0`,
  `blank>250ms=0`, `maxBlank=0ms`, `maxDelay=108ms`, and no Obsidian dev
  errors.
- If resuming OpenSSF hardening, start from:
  `.agents/docs/work/hardening/plans/2026-05-16-openssf-osps-baseline/01-scope-docs-workflow-permissions.md`.
- If continuing the codebase architecture cluster, proceed with coverage
  reconciliation: compare tracked source/config/test/doc paths against phases
  01-09, mark generated-artifact exclusions, and produce a final coverage
  matrix.

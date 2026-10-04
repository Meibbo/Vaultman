# Environment Baseline

- Node: local m2, user `u0_a315`, model `21121210G`, architecture `aarch64`, tmux pane `%245`.
- Room run: `room_20260621_025201_8756df` (`running`). No active claims, target tasks, scope conflicts, target owner, or current-pane Room record were found. No blind join was performed.
- Historical target lane: `u130-c1-grouping`, pool `muse13`, exit `0`, no attempt passport. It is not live.
- Web Lab playground leases: all listed playground vaults were free. `Zenless Zone` is a developer-selected PC vault outside that allocation pool.
- Provider snapshot: Zen manual state `available`; OpenRouter admitted with an unlimited/null ceiling; OpenAI 5-hour `84%` and weekly `53%`; Antigravity Gemini 5-hour `97.99%` and weekly `12.980919%`; Antigravity Claude `100%` for both windows; Anthropic 5-hour `0%` and weekly `13%`.
- `lane status` completed with exit `0` in the observed run. `lane pools` is slow: a 35-second bounded run printed `openrouter`, `zen`, `openrouter2`, `muse13`, `antigravity`, and `minimax` as `VIVO`, then timed out with exit `124`; direct admission also passed for OpenAI.
- `pkmai-delegate status` contains 11 stale passports marked `running`, all for canonical `/data/data/com.termux/files/home/wt/u130`; none owns the target. `SUB-AGENTS` contains only its placeholder, and no live pane carries those passport IDs.
- PC registry and read-only eval both returned the exact vault name `Zenless Zone`; CDP showed one existing `:3443` tab for vault ID `b0634b35f2c0f604`.

## Canonical Fast-Forward - 2026-10-03

- Execution node was reconfirmed as local m2: user `u0_a315`, model `21121210G`. No SSH to m2 was used.
- Execution-time canonical identity: `/data/data/com.termux/files/home/wt/u130`, branch `release/beta9`, clean HEAD `1bfcbfbe71ca6dc923e4f97a0cb3bd1584ae0977`.
- Execution-time target identity before the operation: `/data/data/com.termux/files/home/wt/u130-c1-grouping`, branch `fix/u130-polish-update-1002`, HEAD `b548e03201215f954889ea70fb038b6243651dd2`.
- Pre-merge ancestry was safe: merge-base `b548e03201215f954889ea70fb038b6243651dd2`, target 11 commits behind canonical and 0 ahead. Target tracked status was clean; its only status entry was the required untracked `.opencode/skills/tasksmd-writing/SKILL.md`.
- Pre-merge skill SHA256: `b6bc025a74573cd685154e188ac423206c2759aa079db075abfd592379a78cd7`. `node_modules` remained a symlink to `/data/data/com.termux/files/home/vaultman/node_modules`.
- Ownership gate: historical lane `u130-c1-grouping` in pool `muse13` was `fin`; `pkmai-delegate status` returned no running passport whose workdir was the target; Room `room_20260621_025201_8756df` was `running` with `activeClaims: []`, `scopeConflicts: []`, and no target agent or task record.
- Admission gate: `lane pools` reported `muse13` as `VIVO`; `pkmai-delegate check --provider zen` returned `{"ok":true,"provider":"zen","admitted":true}`.
- A stale interrupted read-only Antigravity scout (`d_20261002_163146_8943_25482`, PIDs `10746`/`10760`) still mentioned the target only in its prompt. Both processes had cwd `/data/data/com.termux/files/home`, no open target file descriptor, no live tmux pane, and no lane, passport, or Room ownership, so they were not a target owner or conflicting claim.
- Operation: `GIT_MASTER=1 git -C /data/data/com.termux/files/home/wt/u130-c1-grouping merge --ff-only 1bfcbfbe71ca6dc923e4f97a0cb3bd1584ae0977`.

### Exact Merge Output

```text
Updating b548e032..1bfcbfbe
Fast-forward
 CHANGELOG.md                                 |  58 +++++++++-
 docs/whats-new.md                            |  15 +++
 manifest.json                                |   2 +-
 package.json                                 |   2 +-
 scripts/generate-sasi-lifecycle.mts          |   2 +-
 scripts/release.mjs                          |  20 +++-
 src/VaultmanFrame.svelte                     |   8 +-
 src/VaultmanFrame.ts                         |   6 +-
 src/components/containers/explorerFiles.ts   |   2 +-
 src/components/containers/explorerPlugins.ts |   7 ++
 src/components/containers/explorerProps.ts   |   7 +-
 src/components/layout/apiSceneHost.svelte    | 100 +++++++++++++----
 src/components/layout/navbarFilters.svelte   | 157 ++++++++++++++++-----------
 src/components/layout/popupSort.svelte       |   2 +-
 src/components/layout/viewGrid.ts            |   3 +-
 src/components/layout/viewNodeTable.ts       |   3 +-
 src/components/layout/viewTree.ts            |   2 +-
 src/components/pages/pageFilters.svelte      |   5 +-
 src/logic/logicAddonExplorer.ts              |   2 +-
 src/logic/logicGroupContextMenu.ts           |   2 +-
 src/logic/logicPluginNativeActions.ts        |   2 +-
 src/logic/logicSasiLifecycleCatalogue.ts     |   2 +-
 src/logic/logicSortMenu.ts                   |   5 +-
 src/logic/logicTreeGroupProjection.ts        |   2 +-
 src/services/serviceSettingPageCache.ts      |   4 +-
 src/styles/components/_group-header.scss     |   8 +-
 src/utils/filter-evaluator.ts                |   3 +
 test/component/scopeConfigRows.test.ts       |  14 ++-
 test/unit/interactionModeSource.test.ts      |  16 ++-
 test/unit/nestedProjection.test.ts           |  11 +-
 test/unit/treeDblClickEditable.test.ts       |  12 +-
 test/unit/treeGroupProjection.test.ts        |  16 ++-
 versions.json                                |   3 +-
 33 files changed, 367 insertions(+), 136 deletions(-)
```

### Changed-By-FF Source List

```text
M CHANGELOG.md
M docs/whats-new.md
M manifest.json
M package.json
M scripts/generate-sasi-lifecycle.mts
M scripts/release.mjs
M src/VaultmanFrame.svelte
M src/VaultmanFrame.ts
M src/components/containers/explorerFiles.ts
M src/components/containers/explorerPlugins.ts
M src/components/containers/explorerProps.ts
M src/components/layout/apiSceneHost.svelte
M src/components/layout/navbarFilters.svelte
M src/components/layout/popupSort.svelte
M src/components/layout/viewGrid.ts
M src/components/layout/viewNodeTable.ts
M src/components/layout/viewTree.ts
M src/components/pages/pageFilters.svelte
M src/logic/logicAddonExplorer.ts
M src/logic/logicGroupContextMenu.ts
M src/logic/logicPluginNativeActions.ts
M src/logic/logicSasiLifecycleCatalogue.ts
M src/logic/logicSortMenu.ts
M src/logic/logicTreeGroupProjection.ts
M src/services/serviceSettingPageCache.ts
M src/styles/components/_group-header.scss
M src/utils/filter-evaluator.ts
M test/component/scopeConfigRows.test.ts
M test/unit/interactionModeSource.test.ts
M test/unit/nestedProjection.test.ts
M test/unit/treeDblClickEditable.test.ts
M test/unit/treeGroupProjection.test.ts
M versions.json
```

### Safe Verification Commands Identified, Not Run

- `pnpm exec vitest run --config vitest.unit.config.mts test/unit/interactionModeSource.test.ts test/unit/nestedProjection.test.ts test/unit/treeDblClickEditable.test.ts test/unit/treeGroupProjection.test.ts`
- `pnpm exec vitest run --config vitest.component.config.mts test/component/scopeConfigRows.test.ts`
- `pnpm run check`
- `pnpm run lint`
- `pnpm run format:check`
- Avoid `verify`, `stylelint`, `build`, `build:plugin`, `test:integrity`, `test:e2e`, and smoke scripts in this Git-only task because they build, generate, launch runtime surfaces, or broaden beyond the requested baseline operation.

### Post-Merge Verification

- Target HEAD and merge-base are both `1bfcbfbe71ca6dc923e4f97a0cb3bd1584ae0977`; each side is an ancestor of the other.
- Branch remains `fix/u130-polish-update-1002`.
- Tracked status is clean; the only status entry remains `?? .opencode/skills/tasksmd-writing/SKILL.md`.
- Post-merge skill SHA256 remains `b6bc025a74573cd685154e188ac423206c2759aa079db075abfd592379a78cd7`.
- No tests, build, install, deployment, plugin reload, application action, commit, reset, rebase, or force operation was run.

## Pending Evidence

- [ ] Pre-change V8 CPU profile and trace metadata.
- [ ] Reproduction matrix and system/mechanism decomposition.
- [ ] Performance specification and acceptance budgets.
- [ ] Targeted regression-test map.
- [ ] Live QA evidence from the existing `Zenless Zone` tab.

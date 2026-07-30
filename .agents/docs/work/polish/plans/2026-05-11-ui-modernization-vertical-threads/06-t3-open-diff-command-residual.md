---
title: T3 open diff command residual
type: implementation-record
status: active
parent: "[[docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/index|UI modernization vertical threads]]"
created: 2026-05-13T16:23:33
updated: 2026-05-13T17:43:16
tags:
  - polish/t3
  - diff-navbar
  - command-registration
created_by: codex
updated_by: codex
---

# T3 Open Diff Command Residual

## Scope

Branch/worktree:

- Branch: `codex/t3-open-diff-command`.
- Worktree:
  `C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\t3-open-diff-command`.
- Base: `claude/explorer` at required integrated head `03326b8`.
- Ownership: command registration/service command tests for the diff-open path, minimal diff view open plumbing, and compact current docs.

Do-not-touch boundaries were preserved:

- No EDP-010 selection mirror cleanup files were touched.
- No `NodeSelectionService` / `ViewService` selection ownership changes.
- No EDP row contract changes.
- No performance thresholds changed.

## Root Cause

T3 had `viewDiff.svelte` and `viewDiffNavbar.svelte` implemented, but the live command envelope had no registered `open-diff` command and the Tools `file_diff` tab did not render the diff surface. The documented smoke command `vaultman:open-diff` therefore had no command-list entry to invoke.

## Implementation

- `src/services/serviceCommands.ts`
  - Added canonical command id `open-diff`; Obsidian exposes it live as `vaultman:open-diff`.
  - Added `VaultmanCommandHost.openDiffView`.
  - The command activates Vaultman, reveals the Vaultman leaf, then invokes the diff-open hook.
- `src/main.ts`
  - Added `openDiffViewHook`.
  - Passed `openDiffView` into `registerVaultmanCommands`.
- `src/components/frame/frameVaultman.svelte`
  - Added `toolsActiveTab`.
  - Added `openDiffView()` hook that closes active islands/popups, navigates to the `ops` page, selects Tools tab `file_diff`, and applies the frame viewport transform.
  - Binds `toolsActiveTab` into `OperationsPage`.
- `src/components/pages/pageTools.svelte`
  - Made the active Tools tab bindable.
  - Renders existing `ViewDiff` in the `file_diff` tab.
  - Mounts `ViewDiff` only when `file_diff` is active, so inactive Tools tabs do not require diff-only queue fields in existing fixtures.

## TDD Evidence

RED:

- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceCommandsRegistration.test.ts --fileParallelism=false` failed with `Command not registered: open-diff`.
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/pageToolsDiff.test.ts --fileParallelism=false` failed because the active Tools panel had no `.vm-viewdiff`.

GREEN/focused:

- Command registration: 1 unit file / 9 tests passed.
- New Tools diff tab: 1 component file / 1 test passed.
- Existing diff/nav component gate:
  `viewDiffNavbar`, `viewDiffChains`, and `pageToolsDiff` passed 3 files / 8 tests.
- Existing diff/nav unit gate:
  `logicKeyboard`, `serviceDiff`, `serviceDiffSnapshot`, and `serviceCommandsRegistration` passed 4 files / 28 tests.
- Adjacent Tools tabs: `pageToolsSnippets` and `pageToolsPlugins` passed 2 files / 6 tests.
- Frame compile fixture: `frameFaintMultiWindow` passed 1 file / 1 test.

Svelte validation:

- `npx @sveltejs/mcp svelte-autofixer ./src/components/pages/pageTools.svelte --svelte-version 5` returned no issues or suggestions.
- `npx @sveltejs/mcp svelte-autofixer ./src/components/frame/frameVaultman.svelte --svelte-version 5` returned an existing-style parser diagnostic with no line/column:
  `',' expected`. `svelte-check` and the frame component fixture compile the file cleanly.

Required static/build gates:

- `pnpm run lint:full` passed.
- `pnpm run check` passed with 0 errors and 0 warnings.
- `pnpm run build:plugin` passed.
- `git diff --check` passed with CRLF conversion warnings only.
- `node scripts/sync-test-build.mjs` synced the final build into `plugin-dev` and the stress test vault plugin target.

## Live Smoke

Targeted live smoke is currently blocked by the `plugin-dev` vault state, not by a command registration failure in this branch:

- `obsidian vault=plugin-dev plugin:reload id=vaultman` returned `Command "plugin:reload" not found`.
- `obsidian vault=plugin-dev command id=vaultman:open` returned `Command "vaultman:open" not found`.
- `obsidian vault=plugin-dev command id=vaultman:open-diff` returned `Command "vaultman:open-diff" not found`.
- `obsidian vault=plugin-dev commands | Select-String -Pattern 'vaultman|plugin|reload'` only matched `app:reload`.
- `C:\Users\vic_A\Desktop\plugin-dev\.obsidian\community-plugins.json` is currently `[]`, so Vaultman is not enabled in the live test vault.
- `obsidian vault=plugin-dev eval code="(() => !!activeDocument.querySelector('[data-vm-nav=\"next-change\"]'))()"` returned `false`, as expected with the plugin disabled.
- `obsidian vault=plugin-dev dev:errors` reported no captured errors.

Next live smoke step: enable or reload Vaultman in `plugin-dev`, then rerun the documented envelope from T3:

```bash
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev command id=vaultman:open
obsidian vault=plugin-dev command id=vaultman:open-diff
obsidian vault=plugin-dev eval code="(() => !!activeDocument.querySelector('[data-vm-nav=\"next-change\"]'))()"
obsidian vault=plugin-dev dev:errors
```

## Integration Note

- Integrated into `claude/explorer` with merge commit `2b0f5f786a4b59e84b786388188495ac6444fd9b`.
- During the later T4 dashboard/add-ons merge, `frameVaultman.svelte` was resolved so the T3 `openDiffViewHook` survives in both frame modes:
  `OperationsPage` receives `bind:activeTab={toolsActiveTab}` in the standard page strip and in the dashboard `dashboardExplorer` snippet.
- Final integrated T3/T4 unit gate passed 8 files / 87 tests, including `serviceCommandsRegistration`.
- Final integrated T3/T4 component gate passed 11 files / 38 tests, including `pageToolsDiff`, `viewDiffNavbar`, and `viewDiffChains`.

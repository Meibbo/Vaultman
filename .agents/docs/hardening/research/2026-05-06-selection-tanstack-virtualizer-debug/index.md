---
title: Selection hang and TanStack virtualizer assimilation
type: research
status: active
parent: "[[docs/work/hardening/specs/2026-05-06-node-selection-service/index|node-selection-service]]"
created: 2026-05-06T20:59:51
updated: 2026-05-06T20:59:51
tags:
  - agent/research
  - initiative/hardening
  - explorer/selection
  - explorer/virtualization
  - obsidian/debugging
---

# Selection Hang And TanStack Virtualizer Assimilation

## Trigger

User reported a critical Obsidian runtime bug: selecting any explorer node hung
the whole app, and the plugin still caused general lag. The user also asked for
online research rather than another local-only assumption loop and requested
assimilating TanStack Svelte virtualizer.

## Reproduction

Obsidian CLI reproduced the user-facing hang before the fix:

- `obsidian plugin:reload id=vaultman` passed.
- `obsidian command id=vaultman:open` passed.
- Dispatching pointer/mouse selection events to the first
  `.vm-tree-virtual-row[data-id]` timed out after 20 seconds.
- After that, `obsidian dev:errors` and `obsidian dev:console` also timed out,
  confirming that the app/dev channel was wedged.
- Restarting Obsidian restored the CLI channel; no persistent error stack was
  captured after restart.

## Root Cause

`panelExplorer.svelte` refreshed provider trees inside a Svelte `$effect`.
Providers decorate tree nodes by calling `plugin.viewService.getModel(...)`.
`ViewService.getModel(...)` reads `SvelteMap` / `SvelteSet` state for selection
and focus. That made provider decoration state a hidden dependency of the
refresh effect.

The click path then formed a feedback loop:

1. Row click mutates `NodeSelectionService`.
2. `commitSelection(...)` mirrors into `ViewService`.
3. The refresh effect reruns because `provider.getTree()` previously tracked
   `ViewService` reactive reads.
4. Refresh assigns `nodes`.
5. The prune effect mirrors selection again.
6. `ViewService` mutates again and restarts the cycle.

The focused regression test now covers this by mounting `PanelExplorer` with a
real `ViewService` and a provider whose `getTree()` decorates through
`viewService.getModel(...)`. The test initially failed quickly with:

```text
provider tree refreshed from selection mirror
```

## Fix

- `panelExplorer.svelte` imports Svelte `untrack` and uses it around provider
  refresh work and selection mirroring that must not subscribe to decoration
  state.
- `commitSelection(...)` now has a compact snapshot key guard so redundant
  mirrors do not clear and rebuild `ViewService` selection.
- `syncFileSelectionFromNodes(...)` refreshes `showSelectedOnly` data through
  `untrack` to avoid accidental effect dependencies.
- `ViewService.subscribe(...)` is now a real per-explorer subscriber registry.
  Mutators notify only when their state actually changes.

## TanStack Assimilation

Current source check:

- `@tanstack/svelte-virtual@3.13.24` is the current package version available
  through `pnpm info`.
- Its Svelte adapter returns a Svelte readable store of a virtualizer instance;
  component code must use `$virtualizer` and call `setOptions(...)` through an
  untracked boundary inside effects.
- The package peer range supports Svelte 5.

Implementation:

- Added `@tanstack/svelte-virtual@3.13.24`.
- Replaced the tree viewport windowing in `viewTree.svelte` with TanStack
  `createVirtualizer(...)`.
- Rebuilt `ViewNodeGrid.svelte` as a virtualized row grid using TanStack. Grid
  mode no longer mounts every node tile.
- Rectangle selection now computes target ids from virtual coordinates rather
  than scanning only mounted DOM nodes.
- ResizeObserver callbacks in the new virtualizers defer measurements through
  `requestAnimationFrame` to avoid Obsidian/Electron ResizeObserver loop
  warnings on the tested route.

## Verification

Automated:

- `pnpm exec vp test run --project component --config vitest.config.ts test/component/panelExplorerSelection.test.ts --fileParallelism=false`
- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceViews.test.ts`
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTreeSelection.test.ts test/component/viewGridSelection.test.ts test/component/panelExplorerSelection.test.ts --fileParallelism=false`
- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceSelection.test.ts test/unit/services/serviceViews.test.ts test/unit/services/serviceVirtualizer.test.ts`
- `pnpm run check`
- `pnpm run build`
- `pnpm run lint`
- `git diff --check -- package.json pnpm-lock.yaml src/components/containers/panelExplorer.svelte src/components/views/ViewNodeGrid.svelte src/components/views/viewTree.svelte src/services/serviceViews.svelte.ts src/styles/data/_grid.scss styles.css test/component/panelExplorerSelection.test.ts test/component/viewGridSelection.test.ts`

Obsidian CLI:

- Tree row click after final build selected one row and returned without hang.
- Grid mode opened through the view-mode control.
- Grid tile click selected one tile and rendered a virtual tile window instead
  of all tiles.
- Final `obsidian dev:errors` plus
  `.agents/tools/pkm-ai/analyze-logs.mjs` returned `No errors captured` and
  `Found 0 error lines.`

Tooling note:

- One `pnpm run build` run hit the known transient Vite/Svelte resolver issue
  and passed on immediate sequential rerun without code changes.
- One component test run hit the known transient resolver issue when Svelte
  checks were run in parallel; sequential rerun passed.

## Source Links

- Svelte `$effect`: https://svelte.dev/docs/svelte/$effect
- Svelte `untrack`: https://svelte.dev/docs/svelte/svelte#untrack
- Svelte reactive collections: https://svelte.dev/docs/svelte/svelte-reactivity
- TanStack Svelte Virtual: https://tanstack.com/virtual/latest/docs/framework/svelte/svelte-virtual
- Obsidian CLI: https://help.obsidian.md/cli

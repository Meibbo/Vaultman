---
title: Detachable layout workspace tabs - foundation and PageTools
type: implementation-plan-shard
status: draft
parent: "[[docs/work/polish/plans/2026-05-11-detachable-layout-workspace-tabs/index|detachable layout workspace tabs implementation]]"
created: 2026-05-11T00:00:00
updated: 2026-05-11T00:00:00
tags:
  - agent/plan
  - initiative/polish
  - workspace/layout
created_by: codex
updated_by: codex
---

# 01 - Foundation And PageTools

## Task 1: Layout Action Resolution

**Files:**
- Modify: `src/services/serviceLayout.ts`
- Create: `test/unit/services/serviceLayoutDetach.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests that import `resolveLayoutDropAction` from `serviceLayout`:

```ts
expect(resolveLayoutDropAction({
	source: { kind: 'vaultman-tab', tabId: 'explorer-files', surface: 'dock' },
	target: { kind: 'workspace' },
})).toMatchObject({ ok: true, operation: 'detach-tab', tabId: 'explorer-files' });

expect(resolveLayoutDropAction({
	source: { kind: 'vaultman-tab', tabId: 'explorer-files', surface: 'workspace' },
	target: { kind: 'dock' },
})).toMatchObject({ ok: true, operation: 'attach-tab', tabId: 'explorer-files' });

expect(resolveLayoutDropAction({
	source: { kind: 'workspace-tab', viewType: 'markdown', surface: 'workspace' },
	target: { kind: 'dock' },
})).toMatchObject({ ok: false, reason: 'unsupported-source' });
```

- [ ] **Step 2: Verify red**

Run:

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceLayoutDetach.test.ts --fileParallelism=false
```

Expected: fails because `resolveLayoutDropAction` does not exist.

- [ ] **Step 3: Implement minimal pure contract**

Add exported types for `LayoutTabSurface`, `LayoutDropAction`, `LayoutDropSource`, `LayoutDropTarget`, and `resolveLayoutDropAction`. Keep it pure; do not import Obsidian.

- [ ] **Step 4: Verify green**

Run the same unit test. Expected: all new tests pass.

## Task 2: Leaf Detach Reactivity

**Files:**
- Modify: `src/services/serviceLeafDetach.ts`
- Modify: `test/unit/services/serviceLeafDetach.test.ts`

- [ ] **Step 1: Write failing subscription test**

Add a test that subscribes to `LeafDetachService`, calls `detach('page-tools')`, then `attach('page-tools')`, and expects snapshots with the updated boolean map.

- [ ] **Step 2: Verify red**

Run:

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceLeafDetach.test.ts --fileParallelism=false
```

Expected: fails because `subscribe` does not exist.

- [ ] **Step 3: Implement subscription**

Add `subscribe(listener: (state: LeafDetachState) => void): () => void`, keep listeners private, notify after `load`, successful `detach`, successful `attach`, and `restore` if it changes observable state. Return cloned state snapshots.

- [ ] **Step 4: Verify green**

Run the same unit suite. Expected: existing and new tests pass.

## Task 3: DnD Layout Operations

**Files:**
- Modify: `src/services/serviceDnd.ts`
- Modify: `test/unit/services/serviceDnd.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests where a `tab` source dropped on a `workspace` target with `accepts: ['detach-tab']` returns operation `detach-tab`, and a workspace source dropped on a dock target with `accepts: ['attach-tab']` returns `attach-tab`.

- [ ] **Step 2: Verify red**

Run:

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceDnd.test.ts --fileParallelism=false
```

Expected: TypeScript/test failure because the operations are not in `DndOperation`.

- [ ] **Step 3: Implement minimal operation extension**

Extend `DndOperation` to include `detach-tab`, `attach-tab`, and `move-tab-surface`. Update `preferredAcceptedOperation` so explicit accepted operations win before generic `move`/`reorder` fallbacks.

- [ ] **Step 4: Verify green**

Run the same DnD unit tests.

## Task 4: PageTools Layout Controls

**Files:**
- Create: `src/components/pages/pageToolsLayout.svelte`
- Modify: `src/components/pages/pageTools.svelte`
- Modify: `src/components/settings/SettingsUI.svelte`
- Create: `test/component/pageToolsLayout.test.ts`
- Modify: `test/component/settingsUI.test.ts`

- [ ] **Step 1: Write failing component tests**

Mount `PageToolsLayout` with a fake plugin containing `leafDetachService`. Assert it renders the all-tabs toggle, per-tab rows for `ALL_TAB_IDS`, and detach/attach status. Add a Settings test asserting Settings no longer contains "All tabs as independent leaves".

- [ ] **Step 2: Verify red**

Run:

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/pageToolsLayout.test.ts test/component/settingsUI.test.ts --fileParallelism=false
```

Expected: fails because `PageToolsLayout` does not exist and Settings still renders the old toggle when the service is present.

- [ ] **Step 3: Implement pageTools layout surface**

Create `PageToolsLayout.svelte` that mounts `MenuCuratorPanel` as before and renders detachable controls below it. Reuse `SettingsLeafToggle` for the global toggle or move the component to a neutral path if imports become misleading. Remove the `SettingsLeafToggle` block and import from `SettingsUI.svelte`.

- [ ] **Step 4: Wire pageTools**

Replace the direct `MenuCuratorPanel` layout tab block in `pageTools.svelte` with `<PageToolsLayout {plugin} />`.

- [ ] **Step 5: Verify green**

Run the component command again.


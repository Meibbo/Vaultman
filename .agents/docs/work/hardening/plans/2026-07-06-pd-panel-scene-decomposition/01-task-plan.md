---
title: P.D kickoff — task plan
type: plan-shard
status: active
parent: "[[docs/work/hardening/plans/2026-07-06-pd-panel-scene-decomposition/index|P.D panel/scene decomposition kickoff]]"
created: 2026-07-06T12:20:00
created_by: codex-gpt-5
tags:
  - agent/plan
  - spine/P.D
---

# P.D Panel/Scene Decomposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **EXECUTED 2026-07-06/08** — codex-gpt-5 ejecutó Tasks 0-4 en 3 slices (`fcf895e` Tasks 1-4,
> `18465c2` + `0359780` = ensanchamiento InputRouter/puertos aprobado por review de coordinador);
> claude-fable-5 cerró Task 5 (gate integrado verde @ `9a56172`: check 0/0 · unit 178f/1303t ·
> build ✓). Los checkboxes de abajo quedan como registro de la forma planeada; el estado real
> vive en el Status Log del [[index|index]]. Filenames de tests = los del plan (sin colocated).

**Goal:** Start the P.D spine by extracting panel/scene contracts without changing user-visible Explorer behavior.

**Architecture:** P.D is the bridge from the completed V.D/Thread-B work into MyWorkspace N3. The first slice defines typed `PanelHandle`, `Scene`, `WorkspaceMediator`, `InteractionPolicy`, and `InputRouter` seams, then adapts the existing single Explorer panel through those seams while keeping `frameVaultman`/`pageFilters` visually identical.

**Tech Stack:** Svelte 5 runes/components, TypeScript, Obsidian plugin API, existing `ViewHostService`, `panelExplorer`, `frameNavigation`, `frameOverlays`, `serviceKeyboardNav`, `typeActionRouting`, and Vitest component/unit gates.

---

## File Structure

- Create: `src/types/typePanelScene.ts`
- Create: `src/logic/logicInteractionPolicy.ts`
- Create: `src/services/serviceWorkspaceMediator.svelte.ts`
- Create: `src/services/servicePanelHandle.ts`
- Modify: `src/components/pages/pageFilters.svelte`
- Modify later only after tracer is green: `src/components/frame/frameVaultman.svelte`, `src/components/frame/frameNavigation.svelte.ts`, `src/components/frame/frameOverlays.svelte.ts`
- Test: `test/unit/types/typePanelScene.test.ts`
- Test: `test/unit/logic/logicInteractionPolicy.test.ts`
- Test: `test/unit/services/serviceWorkspaceMediator.test.ts`
- Test: `test/unit/services/servicePanelHandle.test.ts`
- Regression tests: existing `panelExplorerViewHostMount.test.ts`, `ViewHost.test.ts`, and frame/page snapshots.

## Task 0: Baseline And Guardrails

**Files:**
- Read only: `docs/architecture/explorer-model/03-surfaces-and-interaction.md`
- Read only: `docs/architecture/explorer-model/04-panels-axons-mutation-layout.md`
- Read only: `src/components/pages/pageFilters.svelte`
- Read only: `src/components/containers/panelExplorer.svelte`
- Read only: `src/components/frame/frameNavigation.svelte.ts`
- Read only: `src/components/frame/frameOverlays.svelte.ts`

- [ ] **Step 1: Create a clean worktree**

```powershell
git fetch origin
git worktree add C:/tmp/vaultman-pd -b umbrella-v2/pd-slice1 origin/sandbox
cd C:/tmp/vaultman-pd
corepack pnpm install
```

Expected: worktree HEAD is `origin/sandbox` at or after `7107b1a`; install exits 0.

- [ ] **Step 2: Run baseline gates before edits**

```powershell
corepack pnpm run check
$env:VM_NOTEBOOK_NAVIGATOR_ROOT='C:/Users/vic_A/Desktop/notebook-navigator'
corepack pnpm run test:unit -- --maxWorkers=3
corepack pnpm run build
```

Expected: `check` is 0/0, unit exits 0, build exits 0.

## Task 1: Type The P.D Contracts

**Files:**
- Create: `src/types/typePanelScene.ts`
- Create: `test/unit/types/typePanelScene.test.ts`

- [ ] **Step 1: Write failing type/runtime tests**

Create tests that construct a `panelExplorer` descriptor, a single-tile scene, an active context `{ sceneId, panelId }`, and default scope `focused-scene`.

Expected first run: fail because `src/types/typePanelScene.ts` does not exist.

- [ ] **Step 2: Add the pure type module**

Create `src/types/typePanelScene.ts` exporting:

- `PanelKind = 'panelExplorer' | 'panelData' | 'panelContent' | 'custom-panel'`
- `PanelId`, `SceneId`, `SurfaceId`, `TileId`
- `PanelHandleCore`, `PanelHandle`
- `SceneTile`, `SceneDefinition`
- `WorkspaceActiveContext`, `WorkspaceScope`, `WorkspaceTarget`

Constraints:

- `PanelHandleCore` has `id`, `kind`, optional `providerId`, `focus()`, `produceDragPayload()`, `acceptsDrop(intent)`, optional `revealNode(id)`.
- `PanelHandle` adds optional `selection`, `projection`, and `expansion`.
- `SceneDefinition` is layout-only: `id`, `surfaceId`, `rootTile`, optional `activePanelId`; no provider state, no selection state.

- [ ] **Step 3: Run and commit**

```powershell
corepack pnpm run test:unit -- test/unit/types/typePanelScene.test.ts
git add src/types/typePanelScene.ts test/unit/types/typePanelScene.test.ts
git commit -m "feat(pd): add panel scene contract types"
```

Expected: focused test passes before commit.

## Task 2: Add Pure InteractionPolicy Tracer

**Files:**
- Create: `src/logic/logicInteractionPolicy.ts`
- Create: `test/unit/logic/logicInteractionPolicy.test.ts`
- Modify: `src/types/typePanelScene.ts`

- [ ] **Step 1: Write failing policy tests**

Cover:

- node payload from `panelExplorer` to another `panelExplorer` target returns `{ kind: 'panel-drop' }`.
- tag-node payload to editor caret target returns `{ kind: 'editor-insert-tag' }`.
- unsupported target returns `{ kind: 'reject', reason: 'unsupported-target' }`.

- [ ] **Step 2: Implement pure policy shapes**

Add `PanelDragPayload`, `WorkspaceDropTarget`, `WorkspaceOperationIntent`, `InteractionReject`, and `InteractionPolicyResult` to `typePanelScene.ts`.

Create:

```ts
export function resolveInteractionPolicy(
  payload: PanelDragPayload,
  target: WorkspaceDropTarget,
): InteractionPolicyResult
```

Keep it pure and conservative. Return operation intents only; do not enqueue real operations yet.

- [ ] **Step 3: Run and commit**

```powershell
corepack pnpm run test:unit -- test/unit/logic/logicInteractionPolicy.test.ts test/unit/types/typePanelScene.test.ts
git add src/types/typePanelScene.ts src/logic/logicInteractionPolicy.ts test/unit/logic/logicInteractionPolicy.test.ts test/unit/types/typePanelScene.test.ts
git commit -m "feat(pd): add pure interaction policy tracer"
```

## Task 3: Add WorkspaceMediator Service Skeleton

**Files:**
- Create: `src/services/serviceWorkspaceMediator.svelte.ts`
- Create: `test/unit/services/serviceWorkspaceMediator.test.ts`

- [ ] **Step 1: Write failing mediator tests**

Cover registering/unregistering scenes and panel handles, `setActiveContext(sceneId, panelId)`, `getActivePanel()`, default `resolveScope()`, and `routeInteraction(payload, target)` delegation.

- [ ] **Step 2: Implement service skeleton**

Create `WorkspaceMediatorService` with private maps for scenes and panel handles. It must hold no provider-specific state, no DOM references, and no Obsidian `WorkspaceLeaf` mutation. Methods: `registerScene`, `unregisterScene`, `registerPanel`, `unregisterPanel`, `setActiveContext`, `getActiveContext`, `getActivePanel`, `resolveScope`, `routeInteraction`.

- [ ] **Step 3: Run and commit**

```powershell
corepack pnpm run test:unit -- test/unit/services/serviceWorkspaceMediator.test.ts test/unit/logic/logicInteractionPolicy.test.ts
git add src/services/serviceWorkspaceMediator.svelte.ts test/unit/services/serviceWorkspaceMediator.test.ts
git commit -m "feat(pd): add workspace mediator skeleton"
```

## Task 4: Adapt Current Filters Explorer To PanelHandle

**Files:**
- Create: `src/services/servicePanelHandle.ts`
- Create: `test/unit/services/servicePanelHandle.test.ts`
- Modify: `src/components/pages/pageFilters.svelte`

- [ ] **Step 1: Add adapter tests**

Test `createPanelExplorerHandle(args)`: kind is `panelExplorer`, `providerId` is preserved, `focus()` calls the supplied focus callback, `revealNode(id)` calls the supplied reveal callback only when provided, and `acceptsDrop` returns false until a concrete drop path is wired.

- [ ] **Step 2: Implement adapter helper**

Create `src/services/servicePanelHandle.ts` exporting `createPanelExplorerHandle`. Keep the helper pure over callbacks; do not import Svelte or Obsidian.

- [ ] **Step 3: Wire `pageFilters.svelte` without changing DOM**

Instantiate one `panelExplorer` handle for the active filters page and register/unregister it with the mediator only when a mediator context exists. If no mediator context exists, current behavior remains unchanged.

- [ ] **Step 4: Run and commit**

```powershell
corepack pnpm run test:unit -- test/unit/services/servicePanelHandle.test.ts
corepack pnpm run test:component -- test/component/panelExplorerViewHostMount.test.ts test/component/ViewHost.test.ts
git add src/services/servicePanelHandle.ts src/components/pages/pageFilters.svelte test/unit/services/servicePanelHandle.test.ts
git commit -m "feat(pd): expose filters explorer as panel handle"
```

## Task 5: Coordinator Verification

- [ ] **Step 1: Run full headless gates**

```powershell
corepack pnpm run check
$env:VM_NOTEBOOK_NAVIGATOR_ROOT='C:/Users/vic_A/Desktop/notebook-navigator'
corepack pnpm run test:unit -- --maxWorkers=3
corepack pnpm run build
git diff --check
```

Expected: check 0/0, unit exits 0, build exits 0, diff-check clean.

- [ ] **Step 2: Optional live smoke only if Obsidian is stable**

```powershell
corepack pnpm smoke:scroll -- --view=tree --strict-flicker --no-build --no-reload
corepack pnpm smoke:scroll -- --view=list --strict-flicker --no-build --no-reload
```

Expected: blank/flicker metrics remain zero. If Obsidian is unstable, record the skip and rely on headless gates.

- [ ] **Step 3: Close session**

Append a session-log entry, mark the room task done, release the task, mailbox the coordinator, and fast-forward `sandbox` only after the branch is verified and clean.

## Self-Review

- Spec coverage: this plan covers the locked P.D tier model, PanelHandle core, WorkspaceMediator statelessness, InteractionPolicy purity, and the first tracer that adapts the existing Explorer panel without a visual rewrite.
- Intentional deferrals: WSA/tile editing, multi-surface routing, `panelData`, `panelContent`, PSS scene persistence, and live-layout-edit are explicitly out of scope.
- Placeholder scan: no task uses deferred-work placeholder language as an implementation requirement.
- Risk: if an executing agent chooses colocated test filenames for an existing convention, the assertions and command gates in this plan remain mandatory and the final filename must be recorded in session-log.

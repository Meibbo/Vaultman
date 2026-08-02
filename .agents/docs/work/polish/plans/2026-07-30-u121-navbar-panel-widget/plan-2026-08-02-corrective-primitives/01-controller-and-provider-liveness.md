---
title: U121-003 plan 01 - controller and provider liveness
type: implementation-plan-shard
status: pending-approval
parent: "[[index|U121-003 corrective implementation plan]]"
updated: 2026-08-02
---

# 01 — Scene controller and provider liveness

Do not execute this shard until the developer approves the implementation plan.

## Task 1.1 — Lock the atomic owner/generation contract

**Files:**

- Create: `test/unit/scenePanelWidgetController.test.ts`
- Create: `src/logic/logicScenePanelWidgetController.ts`
- Modify: `src/types/typePanelWidget.ts`

- [ ] From the product worktree, record `git rev-parse HEAD`, `git status --short`
  and confirm `cac504a9` is an ancestor or the current HEAD; do not discard any
  other agent's changes.
- [ ] Add tests proving that a controller accepts the current Scene/provider
  generation, rejects an older generation, rejects another `sceneInstanceId`,
  and makes `clear` conditional on the same owner/generation.
- [ ] Add a test proving that two controllers using the same provider ID have
  independent state.
- [ ] Run:
  `pnpm exec vitest run --config vitest.unit.config.mts test/unit/scenePanelWidgetController.test.ts`
  and confirm RED because the controller module does not exist.
- [ ] Add these contracts to `src/types/typePanelWidget.ts`:

```ts
export interface ScenePanelWidgetEnvelope {
  sceneInstanceId: string;
  providerId: string;
  generation: number;
  projection: NavbarPanelWidgetState;
}

export type ScenePanelWidgetPublication = ScenePanelWidgetEnvelope;
```

- [ ] Implement the pure ownership core in
  `src/logic/logicScenePanelWidgetController.ts` with this public shape:

```ts
export class ScenePanelWidgetController {
  constructor(readonly sceneInstanceId: string);
  begin(providerId: string): number;
  publish(publication: ScenePanelWidgetPublication): ScenePanelWidgetEnvelope | null;
  clear(owner: Pick<ScenePanelWidgetEnvelope, 'sceneInstanceId' | 'providerId' | 'generation'>): boolean;
  current(): ScenePanelWidgetEnvelope | null;
  destroy(): void;
}
```

`begin` increments a Scene-local monotonic generation and makes that provider the
only current owner. `publish` accepts only the exact active tuple. `clear` cannot
clear a later provider publication. `destroy` invalidates all outstanding tokens.
- [ ] Keep the class DOM-free, Svelte-free and provider-implementation-free.
- [ ] Re-run the focused suite and confirm GREEN.
- [ ] Run `pnpm run check` and correct type errors without widening the contract.

## Task 1.2 — Replace split provider caches with one envelope

**Files:**

- Modify: `test/unit/panelWidgetRegressions.test.ts`
- Modify: `test/unit/panelWidgetHostSource.test.ts`
- Modify: `src/VaultmanFrame.svelte`
- Modify: `src/components/pages/pageFilters.svelte`
- Modify: `src/components/pages/pageStatistics.svelte`
- Modify: `src/components/layout/navbarPanelWidgetHost.svelte`

- [ ] Extend `panelWidgetRegressions.test.ts` with a regression sequence
  `Files -> Statistics -> Props -> Files` where the late Statistics publication
  is rejected and the final Files projection remains active.
- [ ] Extend `panelWidgetHostSource.test.ts` to fail if the host is keyed by
  `providerId`, if `VaultmanFrame.svelte` stores separate Filters/Statistics
  panelWidget states, or if provider navigation waits on `tick()` to publish UI.
- [ ] Run both tests and confirm RED against the current split `$state` caches,
  `{#key mountedState.providerId}` and navigation workaround.
- [ ] In `VaultmanFrame.svelte`, instantiate exactly one controller for the Scene
  instance and exactly one reactive `ScenePanelWidgetEnvelope | null` snapshot.
- [ ] On provider/page navigation, call `begin(providerId)` before changing the
  visible page; pass `{sceneInstanceId, providerId, generation}` to that page's
  narrow projection callback.
- [ ] Replace `filtersPanelWidgetState`, `statisticsPanelWidgetState` and the
  derived winner with one `publishPanelWidget(publication)` callback that only
  updates Svelte state when `controller.publish` accepts the tuple.
- [ ] Remove the `await tick()` ordering dependency from `navigateToDataTab`.
- [ ] Make `pageFilters.svelte` and `pageStatistics.svelte` publish complete
  envelopes through the callback. Their cleanup must call guarded `clear`, never
  publish an unconditional `null`.
- [ ] Remove `{#key mountedState.providerId}` from
  `navbarPanelWidgetHost.svelte`; keep one mounted host and replace only its
  projection props.
- [ ] Verify the host imports no concrete Explorer class and performs no provider
  discovery.
- [ ] Run the two focused tests and confirm GREEN.

## Task 1.3 — Prove liveness, instance isolation and teardown

**Files:**

- Modify: `test/unit/panelWidgetProjection.test.ts`
- Modify: `test/unit/panelWidgetRegressions.test.ts`
- Modify: `src/logic/logicPanelWidgetProjection.ts`
- Modify: `src/VaultmanFrame.svelte`

- [ ] Add table-driven projection tests for Files, Props, Tags, Content/Text,
  Snippets, Plugins and Statistics, including their provider-menu identity and
  ActionNode set.
- [ ] Add a two-instance test: a late publication from instance A cannot alter
  instance B even when provider ID and generation number coincide.
- [ ] Add a teardown test: destroying A invalidates an outstanding publication;
  creating C with the same provider ID does not accept it.
- [ ] Run the focused tests and confirm RED on the missing cases.
- [ ] Keep `resolvePanelWidgetProjection` pure; add only the provider identity or
  projection fields required to make the complete envelope self-consistent.
- [ ] Wire `onDestroy` in the Scene root to `controller.destroy()` and close the
  active menu through the later `MenuSession` hook without clearing another Scene.
- [ ] Re-run focused tests and confirm GREEN.
- [ ] Run the Svelte autofixer on `VaultmanFrame.svelte`, `pageFilters.svelte`,
  `pageStatistics.svelte` and `navbarPanelWidgetHost.svelte`; apply every valid
  issue, then re-run it until clean.
- [ ] Run `pnpm run check` and the three panelWidget suites together.

## Task 1.4 — Commit the controller slice

- [ ] Inspect `git diff -- src test` and ensure this slice contains no search,
  selection, properties or settings changes.
- [ ] Run `pnpm run lint` and `pnpm run check`.
- [ ] Stage only this slice's product/test files.
- [ ] Commit code-only as `fix: make panel widget publication generation safe`.
- [ ] Record the commit hash in the execution log; do not stage `.agents/`.

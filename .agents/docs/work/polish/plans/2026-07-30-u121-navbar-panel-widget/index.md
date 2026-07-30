---
title: U121-001–004 + U121-029 — Scene-owned Navbar panelWidget
type: implementation-plan
status: active
parent: "[[docs/work/polish/issues/v1-2-1-polish/index|Vaultman 1.2.1 polish]]"
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags:
  - agent/plan
  - initiative/polish
  - release/1.2.1
  - panel-widget
  - performance
dateCreated: 2026-07-30T05:24:00
updated: 2026-07-30T05:24:00
---

# U121-001–004 + U121-029 implementation plan

## Locked architecture

Navbar is a Scene-owned `panelWidget`, not a page-owned toolbar and not a
provider registry.

1. PSS compatibility boundary resolves `{active provider + effective PVPUI
   config}` into a DOM-free `PanelWidgetProjection`.
2. Provider projectors declare the nodes/cells the projection contains. They do
   not mount renderers.
3. The renderer owns only DOM rendering, measurement, overflow and focus.
4. Action nodes contain an action reference. They do not close over Explorer
   implementations.
5. The owning Scene exposes a narrow WASA-shaped port that routes the resolved
   invocation to the relevant sibling PanelHandle/domain port.
6. Provider/page switches replace the projection but do not remount the
   `panelWidget`.

“Toolbar” remains the v1.2.x UX/settings alias and compatibility input.

## SOLID check

- SRP: projection, action routing, overflow measurement and Svelte rendering
  are separate modules.
- OCP: a new provider adds a projector/handler; it does not modify the renderer
  or overflow algorithm.
- LSP: every provider projection satisfies the same stable node contract.
- ISP: provider projectors receive only the small panel/domain ports they use.
- DIP: the renderer depends on `PanelWidgetProjection` and
  `ScenePanelWidgetActionPort`, never concrete Explorer classes.

## Adversarial findings incorporated

- A single “contribution builder” for every provider would merely replace the
  current god-object. Provider projectors therefore stay separate.
- `invoke()` closures capturing concrete panels would hide the old coupling.
  Nodes therefore carry action references and the Scene port resolves them.
- A global provider/action registry would outlive a Scene and risk duplicate
  listeners across Obsidian leaves. The port and projection are frame-local.
- ResizeObserver callbacks that synchronously change observed geometry can
  loop. Measurements are coalesced through one animation frame and state is
  updated only when the width signature/result changes.
- U121-029 cannot be closed from synthetic timings alone. Instrumentation and
  automated regression guards can land AFK; the large-vault profile remains a
  HITL evidence gate before selecting the production optimization.

## Execution order

### Slice 1 — contract and PSS-compatible projection (U121-001)

Files:

- Create `src/types/typePanelWidget.ts`.
- Create `src/logic/logicPanelWidgetProjection.ts`.
- Create `test/unit/panelWidgetProjection.test.ts`.

TDD:

1. RED: stable IDs, node kinds, PVPUI ordering/availability and unsupported
   nodes are resolved without DOM.
2. RED: provider change yields a new projection while preserving the host key.
3. GREEN: minimal immutable resolver and types.
4. Refactor only after both tests pass.

### Slice 2 — measured overflow (U121-003)

Files:

- Create `src/logic/logicPanelWidgetOverflow.ts`.
- Update `test/unit/toolbarOverflowStrategy.test.ts`.
- Later connect it in `src/components/layout/navbarPanelWidget.svelte`.

TDD:

1. RED: measured widths fit exactly at the boundary.
2. RED: first condensation moves the two rightmost eligible nodes; each
   subsequent deficit moves one additional node leftward.
3. RED: Tools width/gaps participate in the calculation.
4. RED: reordering and dynamic insertion preserve projection order.
5. GREEN: pure packing function returning visible and overflow node IDs.

### Slice 3 — Scene-owned renderer and WASA seam (U121-001)

Files:

- Create `src/components/layout/navbarPanelWidget.svelte`.
- Create `src/logic/logicNavbarSceneActions.ts`.
- Update `src/VaultmanFrame.svelte`.
- Add focused source/component tests.

TDD:

1. RED: exactly one Navbar renderer occurs in the frame source and none in
   provider pages.
2. RED: projection switches do not key/remount the Navbar host.
3. RED: renderer imports no concrete Explorer implementation.
4. RED: action invocation crosses `ScenePanelWidgetActionPort`.
5. GREEN: mount the persistent host and bridge the active Scene projection.

### Slice 4 — Text Has/Hasn’t (U121-002)

Files:

- Update `src/components/pages/pageFilters.svelte`.
- Update `src/components/pages/tabContent.svelte`.
- Update `test/unit/tabContentSource.test.ts` and Content search tests.

TDD:

1. RED: Text projection order is Pause/Resume → Has/Hasn’t → Sort.
2. RED: Has/Hasn’t is absent from the body.
3. RED: invocation changes `contentIsExclusion` live and exposes matching
   icon/tooltip/aria state.
4. GREEN: route the ActionNode through the Scene port without changing search
   semantics.

### Slice 5 — provider migration (U121-004)

Files:

- Add separate provider projectors for Files, Props, Tags, Text, Snippets,
  Plugins and Statistics.
- Update `src/components/pages/pageFilters.svelte`.
- Update `src/components/pages/pageStatistics.svelte`.
- Remove `src/components/layout/navbarFilters.svelte` after the last consumer
  is gone.
- Update affected source guards.

TDD:

1. RED per provider: expected IDs/order/capabilities.
2. RED: Statistics scope and applicable data tabs work; unsupported Index is
   absent.
3. RED: no page can instantiate a second renderer.
4. RED: focus restoration uses stable node IDs across projection changes.
5. GREEN provider by provider, running the focused suite after each migration.

### Slice 6 — interaction and Scene lifecycle performance (U121-029)

Files:

- Extend `src/dev/perfProbe.ts`.
- Instrument `src/VaultmanFrame.ts`.
- Add a lifecycle/interaction smoke runner under `scripts/`.
- Add unit/source guards for probe coverage.

Measured scenarios:

- Scene open: shell setup, Svelte mount, first paint/viewport refresh.
- Scene close: scheduled-work cancellation, Svelte unmount, DOM cleanup.
- Explorer expand-all and collapse-all.
- Single-node expand/collapse when available.
- Reveal active file in Files and Text.

TDD and diagnosis:

1. RED: scenario names and phase metrics exist with balanced start/end cleanup.
2. RED: repeat runner reports median, p95, max and long-task count.
3. GREEN: instrumentation only; no speculative optimization.
4. Sync to plugin-dev and capture a large-vault profile.
5. Identify the dominant synchronous phase from evidence.
6. Add a failing regression test for that phase, apply the smallest fix and
   repeat the same profile.

## Verification and integration

- Product checkpoint `a0eaf5db` on `codex/u121-panel-widget` implements the
  Scene-owned host, DOM-free provider/PVPUI projection, Scene-local WASA action
  port, Text Has/Hasn't relocation, measured condensed overflow and provider
  migration.
- Full gate after the condensed nowrap regression fix: 162 test files / 1042
  tests, lint, TypeScript, Svelte diagnostics, Prettier, Stylelint, production
  build and scorecard all pass.
- U121-029 remains active. On `plugin-dev` with 11,128 files, cached-tree
  expand/collapse/reveal are below 100 ms in a warm run, while Scene open is
  still about 0.6–0.8 s. The remaining phases are `explorer.files.build-tree`
  (~0.25–0.38 s) and `explorer.files.decorate-icons` (~0.27–0.31 s).
- The next performance wave must add and profile cells, sort and nested
  toggles. It must not close U121-029 until those interactions and Scene
  open/close meet the accepted live-vault budget.

- Focused tests after every RED/GREEN cycle.
- `pnpm run test:unit`, `pnpm run check`, `pnpm run lint`,
  `pnpm run format:check`, `pnpm run stylelint`, `pnpm run build:plugin` and
  `pnpm run test:scorecard`.
- Run the Svelte autofixer on every modified/new `.svelte` file, correct all
  findings, then run it again.
- Commit product code separately from `.agents/` memory.
- Cherry-pick code-only commits into `codex/integrate-1.2.1` only after focused
  and full gates pass.
- Sync the integrated build to plugin-dev for the U121-029 HITL profile.

## Explicit non-goals

- No global provider registry.
- No full sandbox WIR/PSS implementation on stable 1.2.1.
- No rewrite of Explorer PanelHandles unrelated to Navbar actions.
- No speculative “performance fix” before the U121-029 profile identifies the
  dominant cost.

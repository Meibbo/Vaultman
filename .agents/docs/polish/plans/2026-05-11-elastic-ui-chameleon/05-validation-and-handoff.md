---
title: Elastic UI Validation And Handoff
type: implementation-plan-shard
status: draft
parent: "[[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/index|elastic-ui-chameleon]]"
created: 2026-05-10T20:20:23
updated: 2026-05-10T20:20:23
tags:
  - agent/plan
  - elastic-ui
  - verification
created_by: codex
updated_by: codex
---

# 05 Validation And Handoff

## Cross-Shard Main View Contract

The 3-column dashboard belongs to the final integration pass after ALPHA exposes
`serviceTheme`, BETA preserves virtualized surfaces, GAMMA secures overlays, and
DELTA preserves interactions.

Modify `src/components/frame/frameVaultman.svelte` in the integration pass:

```svelte
{#snippet dashboardCol1()}
	<ExplorerActiveFiltersComp />
{/snippet}

{#snippet dashboardCol2()}
	<FiltersPage
		{plugin}
		bind:filtersActiveTab
		bind:filtersSearchByTab
		bind:filtersSearchCategory
		bind:filtersFnRState
		bind:filtersOperationScope
		onOperationScopeChange={setFiltersOperationScope}
		bind:tagsExplorer
		bind:propExplorer
		bind:fileList
		bind:selectedCount
		bind:selectedFilePaths
		bind:filtersSortBy
		bind:filtersSortDir
		bind:filtersSortTarget
		bind:filtersViewMode
		bind:filtersBaseChooseMode
		bind:addMode
		showTabs={!filterTabsExternallyMounted}
		{addOpCount}
	/>
{/snippet}

{#snippet dashboardCol3()}
	{#if statsPreviewFile}
		<StatisticsPage {plugin} previewFile={statsPreviewFile} onShowStats={showStatsPage} />
	{:else}
		<OperationsPage {plugin} {icon} />
	{/if}
{/snippet}

{#snippet mobilePages()}
	<div class="vm-pages-viewport" use:viewport.bindViewport>
		<!-- keep existing mobile/sidebar page strip here -->
	</div>
{/snippet}

{#if resolveDashboardEnabled({ width: frameWidth, kind: frameKind, mode: plugin.themeService.mode })}
	<div class="vm-main-dashboard vm-mode-aware" style:--vm-dashboard-columns="280px minmax(0, 1fr) 320px">
		<section class="vm-dashboard-col vm-dashboard-col-filters">
			{@render dashboardCol1()}
		</section>
		<section class="vm-dashboard-col vm-dashboard-col-main">
			{@render dashboardCol2()}
		</section>
		<section class="vm-dashboard-col vm-dashboard-col-details">
			{@render dashboardCol3()}
		</section>
	</div>
{:else}
	{@render mobilePages()}
{/if}
```

Use a `ResizeObserver` on `.vm-root` or `.vm-view` to maintain `frameWidth`.
Do not use viewport width; Obsidian leaves can be narrow inside a wide window.

## Integration Verification Commands

- [ ] Type and Svelte check:

```bash
pnpm run check
```

Expected: `svelte-check found 0 errors and 0 warnings`.

- [ ] Unit service tests:

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceTheme.test.ts test/unit/services/serviceLayoutElastic.test.ts test/unit/services/serviceTextMeasure.test.ts test/unit/services/serviceNodeRowMeasure.test.ts test/unit/services/serviceMouse.test.ts test/unit/services/serviceDnd.test.ts test/unit/services/serviceDndSvelteAdapter.test.ts test/unit/services/serviceNodeBinding.test.ts test/unit/services/serviceNativeSurfaceBinding.test.ts --fileParallelism=false
```

Expected: all listed unit tests pass.

- [ ] Component tests:

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/settingsElasticUi.test.ts test/component/overlayPortalTarget.test.ts test/component/overlayEscapeFocus.test.ts test/component/viewTableStress.test.ts test/component/viewTableSelection.test.ts test/component/viewGridSelection.test.ts test/component/viewGridHoverBadges.test.ts test/component/framePages.test.ts test/component/frameOverlaysCommandHooks.test.ts --fileParallelism=false
```

Expected: all listed component tests pass.

- [ ] Build:

```bash
pnpm run build:plugin
```

Expected: TypeScript and Vite plugin build exit 0.

- [ ] Obsidian reload:

```bash
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev command id=vaultman:open
obsidian vault=plugin-dev dev:errors
```

Expected: plugin reload and open succeed; `dev:errors` contains no Vaultman
stack.

- [ ] Faint Mode runtime:

```bash
obsidian vault=plugin-dev eval code="(() => { const root=activeDocument.querySelector('.vm-root'); return !!root && getComputedStyle(root).getPropertyValue('--vm-accent').trim().length > 0; })()"
```

Expected: returns `true`.

- [ ] Portal runtime:

```bash
obsidian vault=plugin-dev eval code="(() => Array.from(activeDocument.querySelectorAll('.vm-dialog-content,.vm-popover-content')).every(el => el.closest('.vm-root')))()"
```

Expected: returns `true` after an overlay has been opened.

- [ ] Native alias runtime:

```bash
obsidian vault=plugin-dev eval code="(() => { const svc=app.plugins.plugins.vaultman?.nodeBindingService; return ['#project','$wide-table','%calendar'].map(token => !!svc).join(','); })()"
```

Expected: command does not throw and returns `true,true,true` when Vaultman is
loaded. Detailed alias behavior is covered by unit tests.

## Handoff Checklist

- [ ] Each shard records dependency changes it made.
- [ ] Each shard lists files it modified.
- [ ] Each shard includes focused test commands and exact pass/fail output.
- [ ] The integration pass reruns the global verification envelope.
- [ ] `git status --short` is copied into the handoff so the next agent can
  distinguish Elastic UI changes from pre-existing dirty work.
- [ ] If `@thisux/sveltednd` was approved, the handoff names who approved the
  reversal and lists every file changed by the adapter migration.
- [ ] If DaisyUI was not installed directly, the handoff states that the plan
  implemented Daisy-style semantic shortcuts through UnoCSS because official
  DaisyUI integration remains Tailwind-oriented.

## Completion Criteria

The phase is complete only when all of these are true:

- Thin mode visually and structurally mimics native Obsidian classes.
- Thick mode can opt into Daisy-style semantic classes without losing native
  root classes.
- Bits UI overlay content is scoped to the current `.vm-root` in the current
  window.
- Table and grid virtualization remain smooth under the large-vault probe.
- Node notes resolve aliases through `#`, `$`, `%`, and existing property/folder
  contracts.
- Main View uses Svelte 5 snippets for the 3-column dashboard and mobile page
  fallback.
- All commands in this validation file have fresh passing output recorded.

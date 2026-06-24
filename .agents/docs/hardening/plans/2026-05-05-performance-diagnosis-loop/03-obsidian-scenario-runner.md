---
title: Obsidian scenario runner
type: plan-shard
status: completed
parent: "[[docs/work/hardening/plans/2026-05-05-performance-diagnosis-loop/index|performance-diagnosis-loop-plan]]"
created: 2026-05-05T20:58:26
updated: 2026-05-05T21:45:00
tags:
  - agent/plan
  - performance
---

# Obsidian Scenario Runner

## Task 3: DOM-Driven Perf Scenarios

**Files:**

- Modify: `src/dev/perfProbe.ts`
- Create: `test/component/perfProbeDom.test.ts`

- [x] **Step 1: Write failing DOM scenario tests**

Create `test/component/perfProbeDom.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createPerfProbe } from '../../src/dev/perfProbe';

describe('perf probe DOM scenarios', () => {
	it('runs a filters search scenario against the active DOM', async () => {
		document.body.innerHTML = '<input class="vm-filters-search-input" value="" />';
		const probe = createPerfProbe({ now: () => performance.now(), doc: document });

		const result = await probe.api.run('filters-search', { query: 'status' });

		expect(result.scenario).toBe('filters-search');
		expect((document.querySelector('.vm-filters-search-input') as HTMLInputElement).value).toBe('status');
		expect(result.counters['scenario.filters-search'].count).toBe(1);
	});

	it('runs a tree scroll scenario against the active DOM', async () => {
		document.body.innerHTML = '<div class="vm-tree-virtual-outer" style="height:100px;overflow:auto"><div style="height:1000px"></div></div>';
		const probe = createPerfProbe({ now: () => performance.now(), doc: document });

		const result = await probe.api.run('tree-scroll');

		expect(result.scenario).toBe('tree-scroll');
		expect(result.counters['scenario.tree-scroll'].count).toBe(1);
	});
});
```

- [x] **Step 2: Run the failing component test**

Run: `pnpm exec vp test run --project component --config vitest.config.ts --fileParallelism=false test/component/perfProbeDom.test.ts`

Expected: FAIL because `run(name, options)` and scenario-tagged snapshots are not implemented.

- [x] **Step 3: Extend perf probe types**

In `src/dev/perfProbe.ts`, add:

```ts
export type PerfScenarioName =
	| 'filters-search'
	| 'tree-scroll'
	| 'filter-select'
	| 'operation-badges';

export interface PerfScenarioOptions {
	query?: string;
	steps?: number;
}

export interface PerfProbeSnapshot {
	scenario?: string;
	startedAt: number;
	endedAt: number;
	counters: Record<string, PerfProbeCounter>;
	timings: Record<string, PerfProbeTiming>;
}
```

Update `PerfProbeApi.run`:

```ts
run(name: PerfScenarioName, options?: PerfScenarioOptions): Promise<PerfProbeSnapshot>;
```

- [x] **Step 4: Implement DOM helpers**

In `src/dev/perfProbe.ts`, implement these helpers:

```ts
async function waitFrames(count = 2): Promise<void> {
	for (let i = 0; i < count; i += 1) {
		await new Promise<void>((resolve) => activeWindow.requestAnimationFrame(() => resolve()));
	}
}

function inputText(input: HTMLInputElement, value: string): void {
	input.value = value;
	input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
}

function clickElement(element: HTMLElement): void {
	element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}
```

- [x] **Step 5: Implement scenarios**

Implement `run()` so each scenario resets, records one scenario counter, performs DOM work, waits for two animation frames, and returns `snapshot()` with `scenario` set.

Scenario behavior:

- `filters-search`: find `.vm-filters-search-input`, set `options.query ?? 'status'`.
- `tree-scroll`: find `.vm-tree-virtual-outer`, scroll in `options.steps ?? 8` increments.
- `filter-select`: find first `.vm-tree-virtual-row`, click it.
- `operation-badges`: find first `.vm-badge.is-undoable, .vm-badge`, click it if present; still record the scenario if absent.

- [x] **Step 6: Verify component scenario tests**

Run: `pnpm exec vp test run --project component --config vitest.config.ts --fileParallelism=false test/component/perfProbeDom.test.ts`

Expected: PASS.

- [x] **Step 7: Verify the global API in Obsidian**

Run:

```powershell
pnpm run build
obsidian plugin:reload id=vaultman
obsidian command id=vaultman:open
obsidian eval code="window.__vaultmanPerfProbe.run('filters-search',{query:'status'}).then(r=>JSON.stringify(r))"
```

Expected: JSON includes `"scenario":"filters-search"` and counters for `scenario.filters-search`. If `panelExplorer.getTree`, `viewTree.flatten`, or `decoration.decorate` are absent, record which DOM state was active and run again on the Filters page.

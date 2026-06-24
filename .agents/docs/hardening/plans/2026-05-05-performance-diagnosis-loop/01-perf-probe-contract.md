---
title: Perf probe contract
type: plan-shard
status: completed
parent: "[[docs/work/hardening/plans/2026-05-05-performance-diagnosis-loop/index|performance-diagnosis-loop-plan]]"
created: 2026-05-05T20:58:26
updated: 2026-05-05T21:45:00
tags:
  - agent/plan
  - performance
---

# Perf Probe Contract

## Task 1: Pure Perf Probe API

**Files:**

- Create: `src/dev/perfProbe.ts`
- Create: `test/unit/dev/perfProbe.test.ts`

- [x] **Step 1: Write the failing counter and timer tests**

```ts
import { describe, expect, it, vi } from 'vitest';
import { createPerfProbe } from '../../../src/dev/perfProbe';

describe('perf probe contract', () => {
	it('counts events with payload totals', () => {
		const probe = createPerfProbe({ now: () => 10 });

		probe.count('panel.getTree', { nodes: 4 });
		probe.count('panel.getTree', { nodes: 6 });

		expect(probe.snapshot().counters['panel.getTree']).toMatchObject({
			count: 2,
			totalNodes: 10,
		});
	});

	it('measures synchronous work duration', () => {
		let now = 0;
		const probe = createPerfProbe({ now: () => now });
		const result = probe.measure('view.flatten', { nodes: 3 }, () => {
			now = 12;
			return 'ok';
		});

		expect(result).toBe('ok');
		expect(probe.snapshot().timings['view.flatten']).toMatchObject({
			count: 1,
			totalMs: 12,
			maxMs: 12,
			totalNodes: 3,
		});
	});

	it('installs and restores a global hook', () => {
		const target = {} as { __vaultmanPerfProbe?: unknown };
		const probe = createPerfProbe({ now: () => 0 });
		const uninstall = probe.installGlobal(target);

		expect(target.__vaultmanPerfProbe).toBe(probe.api);

		uninstall();
		expect(target.__vaultmanPerfProbe).toBeUndefined();
	});
});
```

- [x] **Step 2: Run the failing unit test**

Run: `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/dev/perfProbe.test.ts`

Expected: FAIL because `src/dev/perfProbe.ts` does not exist.

- [x] **Step 3: Implement the minimal pure probe**

Create `src/dev/perfProbe.ts` with these exported names:

```ts
export interface PerfProbeMetricInput {
	nodes?: number;
	rows?: number;
	visibleRows?: number;
}

export interface PerfProbeCounter {
	count: number;
	totalNodes: number;
	totalRows: number;
	totalVisibleRows: number;
}

export interface PerfProbeTiming extends PerfProbeCounter {
	totalMs: number;
	maxMs: number;
}

export interface PerfProbeSnapshot {
	startedAt: number;
	endedAt: number;
	counters: Record<string, PerfProbeCounter>;
	timings: Record<string, PerfProbeTiming>;
}

export interface PerfProbeApi {
	count(name: string, input?: PerfProbeMetricInput): void;
	measure<T>(name: string, input: PerfProbeMetricInput | undefined, fn: () => T): T;
	reset(): void;
	snapshot(): PerfProbeSnapshot;
	run(name: string): Promise<PerfProbeSnapshot>;
}
```

Implementation rules:

- `createPerfProbe({ now })` returns `{ api, count, measure, reset, snapshot, installGlobal }`.
- `count()` increments only counters.
- `measure()` increments timings and returns the callback result.
- `run(name)` can return a snapshot for now; scenarios are added in Task 3.
- `installGlobal(target)` stores the previous value and restores it on uninstall.

- [x] **Step 4: Verify the unit test passes**

Run: `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/dev/perfProbe.test.ts`

Expected: PASS.

- [x] **Step 5: Check type/lint surface for the new module**

Run: `pnpm run check`

Expected: `svelte-check found 0 errors and 0 warnings`.

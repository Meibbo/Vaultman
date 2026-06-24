---
title: Render hot path instrumentation
type: plan-shard
status: completed
parent: "[[docs/work/hardening/plans/2026-05-05-performance-diagnosis-loop/index|performance-diagnosis-loop-plan]]"
created: 2026-05-05T20:58:26
updated: 2026-05-05T21:45:00
tags:
  - agent/plan
  - performance
---

# Render Hot Path Instrumentation

## Task 2: Instrument Service and Render Boundaries

**Files:**

- Modify: `src/dev/perfProbe.ts`
- Modify: `src/main.ts`
- Modify: `src/services/serviceViews.svelte.ts`
- Modify: `src/services/serviceDecorate.ts`
- Modify: `src/components/containers/panelExplorer.svelte`
- Modify: `src/components/views/viewTree.svelte`
- Modify: `test/unit/dev/perfProbe.test.ts`
- Test: `test/unit/services/serviceViews.test.ts`
- Test: `test/component/reactiveExplorers.test.ts`

Continuation shard: [[docs/work/hardening/plans/2026-05-05-performance-diagnosis-loop/02-render-hot-path-instrumentation-part-2|Render hot path instrumentation part 2]].

- [x] **Step 1: Extend the failing test for a module-level active probe**

Add this test to `test/unit/dev/perfProbe.test.ts`:

```ts
import { clearActivePerfProbe, getActivePerfProbe, setActivePerfProbe } from '../../../src/dev/perfProbe';

it('exposes an optional active probe for hot path instrumentation', () => {
	const probe = createPerfProbe({ now: () => 0 });

	clearActivePerfProbe();
	expect(getActivePerfProbe()).toBeUndefined();

	setActivePerfProbe(probe.api);
	getActivePerfProbe()?.count('service.decorate', { nodes: 1 });

	expect(probe.snapshot().counters['service.decorate'].count).toBe(1);

	clearActivePerfProbe();
	expect(getActivePerfProbe()).toBeUndefined();
});
```

- [x] **Step 2: Run the failing test**

Run: `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/dev/perfProbe.test.ts`

Expected: FAIL because active-probe helpers are not exported.

- [x] **Step 3: Add active-probe helpers**

In `src/dev/perfProbe.ts`, add:

```ts
let activePerfProbe: PerfProbeApi | undefined;

export function setActivePerfProbe(probe: PerfProbeApi): void {
	activePerfProbe = probe;
}

export function clearActivePerfProbe(): void {
	activePerfProbe = undefined;
}

export function getActivePerfProbe(): PerfProbeApi | undefined {
	return activePerfProbe;
}
```

Update `installGlobal()` so it calls `setActivePerfProbe(api)` and its returned uninstall function calls `clearActivePerfProbe()` if the installed probe is still active.

- [x] **Step 4: Install the probe in the plugin lifecycle**

In `src/main.ts`, import:

```ts
import { createPerfProbe } from './dev/perfProbe';
```

Add a private field:

```ts
private uninstallPerfProbe?: () => void;
```

After `this.viewService = new ViewService(...)`, install:

```ts
const perfProbe = createPerfProbe({
	now: () => activeWindow.performance.now(),
});
this.uninstallPerfProbe = perfProbe.installGlobal(activeWindow as unknown as Record<string, unknown>);
```

At the start of `onunload()`, add:

```ts
this.uninstallPerfProbe?.();
this.uninstallPerfProbe = undefined;
```

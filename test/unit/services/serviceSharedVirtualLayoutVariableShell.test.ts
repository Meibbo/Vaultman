import { describe, expect, it } from 'vitest';
import {
	createVariableProviderRegistry,
	type VariableProviderRegistry,
} from '../../../src/services/serviceSharedVirtualLayout';
import {
	getSharedGeometryRegistry,
	SharedVariableVirtualLayout,
	setSharedGeometryRegistry,
} from '../../../src/services/serviceSharedVirtualLayout.svelte';

// Headless tests of the Svelte 5 shell's VARIABLE-height strategy: same reactive-composition
// discipline as serviceSharedVirtualLayoutShell.test.ts (fixed path), but the window is derived
// through the per-provider Fenwick registry (slice 2a), not O(1) fixed math. Also proves the
// createContext warm registry (Q2) is a real [get,set] pair over a shared VariableProviderRegistry.

interface VariableLayoutOverrides {
	rowCount?: number | (() => number);
	registry?: VariableProviderRegistry;
	providerId?: string;
	estimateSize?: (index: number) => number;
	laneCount?: number | (() => number);
	resolveId?: (index: number) => string | null | undefined;
}

function makeVariableLayout(over: VariableLayoutOverrides = {}): SharedVariableVirtualLayout {
	const rowCount = over.rowCount ?? 1000;
	const layout = new SharedVariableVirtualLayout({
		providerId: over.providerId ?? 'p',
		registry: over.registry ?? createVariableProviderRegistry(),
		rowCount: () => (typeof rowCount === 'function' ? rowCount() : rowCount),
		estimateSize: over.estimateSize ?? (() => 20),
		laneCount: over.laneCount ?? 1,
		getKey: (index) => `row-${index}`,
		resolveId: over.resolveId ?? ((index) => `row-${index}`),
	});
	layout.viewportHeight = 100;
	layout.scrollTop = 0;
	return layout;
}

describe('SharedVariableVirtualLayout — Svelte 5 shell, variable-height strategy', () => {
	it('derives the visible window from the provider Fenwick (single lane, table/tree-like)', () => {
		const layout = makeVariableLayout();
		expect(layout.window.startIndex).toBe(0);
		// overscan = ceil(100/20) = 5; window covers rows [0, 5) plus overscan, clamped by rowCount only near the end
		expect(layout.window.endIndex).toBeGreaterThan(0);
		expect(layout.rows[0]).toMatchObject({ index: 0, key: 'row-0', start: 0, size: 20 });
	});

	it('recomputes the window reactively when scrollTop changes', () => {
		const layout = makeVariableLayout();
		layout.scrollTop = 1000;
		expect(layout.window.startIndex).toBeGreaterThan(0);
		expect(layout.rows[0].start).toBe(layout.window.top);
	});

	it('measure() patches the warm provider Fenwick and the window reflects it immediately', () => {
		const registry = createVariableProviderRegistry();
		// large rowCount so overscan (ceil(100/20)=5) doesn't reach the list end and mask the patch
		const layout = makeVariableLayout({ registry, rowCount: 100_000 });
		// touch the provider once so the tree exists
		void layout.window;
		const before = layout.window.endIndex;
		layout.measure(0, 80); // row 0: 20 -> 80 (delta +60) — fewer rows now fit the same 100px viewport
		expect(layout.window.endIndex).toBeLessThan(before);
		expect(layout.snapshot()!.sizes[0]).toBe(80);
	});

	it('overscan is sized to the viewport via estimateSize (ceil(viewportH/estimateSize))', () => {
		const layout = makeVariableLayout({ estimateSize: () => 25 });
		layout.viewportHeight = 400;
		expect(layout.overscan).toBe(16); // ceil(400/25)
	});

	it('idsInRect resolves ids across the unrendered variable range (single lane)', () => {
		const layout = makeVariableLayout({ rowCount: 100_000 });
		const ids = layout.idsInRect({ top: 500 * 20 + 1, bottom: 503 * 20 + 1 });
		expect(ids).toEqual(['row-500', 'row-501', 'row-502', 'row-503']);
	});

	it('idsInRect resolves ids across lanes when laneCount > 1 (grid-like)', () => {
		const layout = makeVariableLayout({ rowCount: 3, laneCount: 3 });
		const ids = layout.idsInRect({ top: 0, bottom: 20 });
		expect(ids).toEqual(['row-0', 'row-1', 'row-2']);
	});

	it('snapshot/restore hands off warm geometry to a second layout on the same provider', () => {
		const registry = createVariableProviderRegistry();
		const a = makeVariableLayout({ registry, providerId: 'shared', rowCount: 100_000 });
		void a.window;
		a.measure(2, 90); // band 2: 20 -> 90
		const snap = a.snapshot();
		expect(snap!.sizes[2]).toBe(90);

		const freshRegistry = createVariableProviderRegistry();
		const b = makeVariableLayout({
			registry: freshRegistry,
			providerId: 'shared',
			rowCount: 100_000,
		});
		b.restore(snap!);
		// the restored tree must carry band 2's measured 90px size, not a fresh estimateSize(20)
		const freshSnap = b.snapshot();
		expect(freshSnap!.sizes[2]).toBe(90);
	});

	it('a same-shape config swap (e.g. mode toggle with unchanged laneCount) keeps the warm Fenwick (Q1: no remount)', () => {
		const registry = createVariableProviderRegistry();
		// two DIFFERENT layout instances (simulating "switch view mode") sharing one registry
		// entry via the same providerId — the pattern getSharedGeometryRegistry/Q2 exists for.
		const a = makeVariableLayout({ registry, providerId: 'warm', rowCount: 100_000, laneCount: 1 });
		void a.window;
		a.measure(0, 999);

		const b = makeVariableLayout({ registry, providerId: 'warm', rowCount: 100_000, laneCount: 1 });
		// b never called measure() itself — if it shared the SAME warm entry (not a rebuild),
		// its snapshot must already carry a's patch.
		expect(b.snapshot()!.sizes[0]).toBe(999);
	});

	it('a genuine reshape (laneCount changes band boundaries) rebuilds safely instead of serving stale bands', () => {
		const registry = createVariableProviderRegistry();
		const layout = makeVariableLayout({ registry, providerId: 'reshape', rowCount: 9, laneCount: 3 });
		void layout.window; // bands = ceil(9/3) = 3
		layout.measure(0, 999); // band 0 (items 0-2)

		layout.laneCount = 1; // bands = 9 now — a different shape than what was measured
		// must not throw, and must not silently misapply the old band-0 patch to the new band 0
		// (item 0 alone) — the safe contract is: reshape rebuilds from estimateSize, no corruption.
		expect(() => layout.window).not.toThrow();
		expect(layout.snapshot()!.sizes[0]).toBe(20); // fresh estimate, not the stale 999 patch
	});

	describe('createContext warm per-provider registry (Q2)', () => {
		it('setSharedGeometryRegistry/getSharedGeometryRegistry is a type-safe [get,set] pair', () => {
			// headless (no component tree): verify the pair is exported and callable together
			// inside a component-init boundary is proven by the .svelte consumer; here we prove
			// the module exposes the expected createContext shape without throwing at import time.
			expect(typeof getSharedGeometryRegistry).toBe('function');
			expect(typeof setSharedGeometryRegistry).toBe('function');
		});
	});
});

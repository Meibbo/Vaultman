import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	clearActivePerfProbe,
	setActivePerfProbe,
	type PerfProbeApi,
} from '../../src/dev/perfProbe';
import {
	measureSceneAsync,
	measureSceneSync,
} from '../../src/logic/logicScenePerformance';
import frameSource from '../../src/VaultmanFrame.ts?raw';
import bottomNavSource from '../../src/components/layout/navbarPillFab.svelte?raw';
import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';
import filtersPageSource from '../../src/components/pages/pageFilters.svelte?raw';
import sceneSmokeSource from '../../scripts/run-scene-interaction-smoke.mjs?raw';

afterEach(() => clearActivePerfProbe());

function fakeProbe() {
	const measure = vi.fn(
		<T>(_name: string, _input: unknown, operation: () => T): T => operation(),
	);
	const measureAsync = vi.fn(
		async <T>(
			_name: string,
			_input: unknown,
			operation: () => Promise<T>,
		): Promise<T> => operation(),
	);
	const api = {
		count: vi.fn(),
		measure,
		measureAsync,
		reset: vi.fn(),
		snapshot: vi.fn(),
		run: vi.fn(),
		clearScrollSmokeOverlay: vi.fn(),
	} as unknown as PerfProbeApi;
	return { api, measure, measureAsync };
}

describe('vm-scene performance boundaries', () => {
	it('measures synchronous Scene actions through the installed probe', () => {
		const { api, measure } = fakeProbe();
		setActivePerfProbe(api);

		const result = measureSceneSync(
			'scene.action.expand-all',
			{ rows: 1 },
			() => 42,
		);

		expect(result).toBe(42);
		expect(measure).toHaveBeenCalledWith(
			'scene.action.expand-all',
			{ rows: 1 },
			expect.any(Function),
		);
	});

	it('measures asynchronous lifecycle work and stays transparent without a probe', async () => {
		const { api, measureAsync } = fakeProbe();
		setActivePerfProbe(api);

		await expect(
			measureSceneAsync('scene.lifecycle.close.unmount', undefined, async () => 'done'),
		).resolves.toBe('done');
		expect(measureAsync).toHaveBeenCalledOnce();

		clearActivePerfProbe();
		expect(
			measureSceneSync('scene.lifecycle.open.mount', undefined, () => 'native'),
		).toBe('native');
	});

	it('instruments Scene open/close phases and the reported micro-freeze actions', () => {
		for (const metric of [
			'scene.lifecycle.open.shell',
			'scene.lifecycle.open.mount',
			'scene.lifecycle.close.cancel',
			'scene.lifecycle.close.unmount',
			'scene.lifecycle.close.cleanup',
			'scene.lifecycle.viewport-refresh',
		]) {
			expect(frameSource).toContain(metric);
		}

		for (const metric of [
			'scene.action.expand-all',
			'scene.action.collapse-all',
			'scene.action.reveal-active-file',
			'scene.action.toggle-cell',
			'scene.action.change-sort',
			'scene.action.toggle-nested',
		]) {
			expect(`${navbarSource}\n${filtersPageSource}`).toContain(metric);
		}
		expect(sceneSmokeSource).toContain('expand-or-collapse');
		expect(sceneSmokeSource).toContain('reveal-active-file');
		expect(sceneSmokeSource).toContain('toggle-cell-on');
		expect(sceneSmokeSource).toContain('toggle-cell-off');
		expect(sceneSmokeSource).toContain('change-sort');
		expect(sceneSmokeSource).toContain('restore-sort');
		expect(sceneSmokeSource).toContain('toggle-nested-off');
		expect(sceneSmokeSource).toContain('toggle-nested-on');
		expect(sceneSmokeSource).toContain('close-scene');
		expect(sceneSmokeSource).toContain('open-scene');
		expect(sceneSmokeSource).toContain('maxStallMs: 100');
		expect(sceneSmokeSource).toContain("supportedEntryTypes.includes('longtask')");
		expect(sceneSmokeSource).toContain('maxLongTaskMs');
		expect(sceneSmokeSource).toContain('commandMs');
		expect(sceneSmokeSource).toContain('elapsedMs: commandMs');
		expect(sceneSmokeSource).toContain(
			"app.workspace.getLeavesOfType('vaultman-frame')",
		);
		expect(sceneSmokeSource).toContain('leaf.detach()');
		expect(sceneSmokeSource).toContain(
			'[data-vaultman-page-id="filters"]',
		);
		expect(sceneSmokeSource).toContain('skippedActions');
		expect(bottomNavSource).toContain('data-vaultman-page-id={pageId}');
	});
});

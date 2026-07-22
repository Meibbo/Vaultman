// eslint-disable-next-line import/no-nodejs-modules -- source guard reads the root CSS file in Vitest's Node environment.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
	DeferredFilterClickCoordinator,
	type FilterPolarity,
} from '../../src/logic/logicFilterPolarity';
import propsSource from '../../src/components/containers/explorerProps.ts?raw';
import tagsSource from '../../src/components/containers/explorerTags.ts?raw';
import treeSource from '../../src/components/layout/viewTree.ts?raw';
import tableSource from '../../src/components/layout/viewNodeTable.ts?raw';

const stylesSource = readFileSync(
	new URL('../../styles.css', import.meta.url),
	'utf8',
);

interface Effect {
	key: string;
	polarity: FilterPolarity;
}

function harness() {
	let nextTimer = 0;
	const timers = new Map<number, () => void>();
	const effects: Effect[] = [];
	const coordinator = new DeferredFilterClickCoordinator<string>({
		thresholdMs: 250,
		onEffect: (key, polarity) => effects.push({ key, polarity }),
		setTimer: (callback) => {
			nextTimer += 1;
			timers.set(nextTimer, callback);
			return nextTimer;
		},
		clearTimer: (timer) => timers.delete(timer as number),
	});
	const flushTimers = () => {
		const callbacks = [...timers.values()];
		timers.clear();
		for (const callback of callbacks) callback();
	};
	return { coordinator, effects, flushTimers, timers };
}

describe('BT5-053 deferred filter polarity interaction', () => {
	it('commits one inactive click as inclusive only after the double-click window', () => {
		const { coordinator, effects, flushTimers } = harness();
		coordinator.click('status', 'status', 'none', 0);
		expect(effects).toEqual([]);
		flushTimers();
		expect(effects).toEqual([{ key: 'status', polarity: 'inclusive' }]);
	});

	it('collapses a fast pair into exactly one exclusive effect', () => {
		const { coordinator, effects, flushTimers } = harness();
		coordinator.click('status', 'status', 'none', 0);
		coordinator.click('status', 'status', 'none', 120);
		expect(effects).toEqual([{ key: 'status', polarity: 'exclusive' }]);
		flushTimers();
		expect(effects).toHaveLength(1);
	});

	it('treats a slow pair as inclusive followed by remove', () => {
		const { coordinator, effects, flushTimers } = harness();
		coordinator.click('status', 'status', 'none', 0);
		flushTimers();
		coordinator.click('status', 'status', 'inclusive', 400);
		expect(effects).toEqual([
			{ key: 'status', polarity: 'inclusive' },
			{ key: 'status', polarity: 'none' },
		]);
	});

	it('does not combine different nodes and cancels pending work on teardown', () => {
		const { coordinator, effects, flushTimers, timers } = harness();
		coordinator.click('status', 'status', 'none', 0);
		coordinator.click('priority', 'priority', 'none', 40);
		coordinator.click('status', 'status', 'none', 80);
		expect(effects).toEqual([{ key: 'status', polarity: 'exclusive' }]);
		coordinator.dispose();
		expect(timers.size).toBe(0);
		flushTimers();
		expect(effects).toHaveLength(1);
	});

	it('keeps active removal terminal when a browser emits a second click', () => {
		const { coordinator, effects, flushTimers } = harness();
		coordinator.click('status', 'status', 'exclusive', 0);
		coordinator.click('status', 'status', 'none', 100);
		flushTimers();
		expect(effects).toEqual([{ key: 'status', polarity: 'none' }]);
	});
});

describe('BT5-053 renderer and explorer wiring', () => {
	it('routes both explorers through the deferred atomic polarity path', () => {
		for (const source of [propsSource, tagsSource]) {
			expect(source).toContain('DeferredFilterClickCoordinator');
			expect(source).not.toContain('event.detail >= 2');
			expect(source).toContain('.filterClicks.click(');
			expect(source).toContain('.filterClicks.dispose()');
		}
		expect(propsSource).toContain('setPropertyNodePolarity');
		expect(tagsSource).toContain('setTagNodePolarity');
	});

	it('uses current Tree/Table/Cards classes and distinct polarity colors', () => {
		expect(treeSource).toContain("row.addClass('is-excluded-filter')");
		expect(treeSource).toContain('row.onkeydown');
		expect(tableSource).toContain("'is-excluded-filter'");
		expect(propsSource).toContain("card.toggleClass('is-excluded-filter'");
		expect(tagsSource).toContain("card.toggleClass('is-excluded-filter'");
		expect(stylesSource).toContain('.vaultman-tree-row.is-excluded-filter');
		expect(stylesSource).not.toContain('.vm-tree-row-surface');
		expect(stylesSource).toContain('.vaultman-tree-bubble-dot--filter');
		expect(stylesSource).toContain(
			'.vaultman-tree-bubble-dot--filter-excluded',
		);
		expect(stylesSource).toMatch(
			/\.vaultman-tree-bubble-dot--filter\s*\{[^}]*var\(--interactive-accent\)/s,
		);
		expect(stylesSource).toMatch(
			/\.vaultman-tree-bubble-dot--filter-excluded\s*\{[^}]*var\(--text-normal\)/s,
		);
	});
});

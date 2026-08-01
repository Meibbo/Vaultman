import { describe, expect, it } from 'vitest';

import {
	reconcileFilterProjectionItems,
	resolveFilterProjectionDelta,
} from '../../src/logic/logicFilterProjectionDelta';

function delta(
	previous: readonly string[],
	next: readonly string[],
	previousSignature = 'state-a',
	nextSignature = previousSignature,
) {
	return resolveFilterProjectionDelta(
		{ paths: previous, stateSignature: previousSignature },
		{ paths: next, stateSignature: nextSignature },
	);
}

describe('U121-012 ordered filter projection delta', () => {
	it('returns a safe no-op for identical paths and state', () => {
		expect(delta(['a', 'b'], ['a', 'b'])).toEqual({
			entered: [],
			exited: [],
			retained: ['a', 'b'],
			orderChanged: false,
			stateOnly: false,
			safe: true,
		});
	});

	it('reports only exited paths when a filter narrows', () => {
		expect(delta(['a', 'b', 'c'], ['a', 'c'])).toMatchObject({
			entered: [],
			exited: ['b'],
			retained: ['a', 'c'],
			orderChanged: false,
			safe: true,
		});
	});

	it('reports only entered paths when a filter widens', () => {
		expect(delta(['a', 'c'], ['a', 'b', 'c'])).toMatchObject({
			entered: ['b'],
			exited: [],
			retained: ['a', 'c'],
			orderChanged: false,
			safe: true,
		});
	});

	it('reports mixed replacement in snapshot order', () => {
		expect(delta(['a', 'b'], ['b', 'c'])).toMatchObject({
			entered: ['c'],
			exited: ['a'],
			retained: ['b'],
			orderChanged: false,
		});
	});

	it('detects a changed relative order among retained paths', () => {
		expect(delta(['a', 'b', 'c'], ['c', 'a'])).toMatchObject({
			entered: [],
			exited: ['b'],
			retained: ['c', 'a'],
			orderChanged: true,
		});
	});

	it('distinguishes state-only polarity changes from path changes', () => {
		expect(delta(['a', 'b'], ['a', 'b'], 'include', 'exclude')).toMatchObject({
			entered: [],
			exited: [],
			orderChanged: false,
			stateOnly: true,
			safe: true,
		});
	});

	it.each([
		[['a', 'a'], ['a']],
		[['a'], ['a', 'a']],
	] as const)('rejects duplicate-path snapshots defensively', (previous, next) => {
		expect(delta(previous, next).safe).toBe(false);
	});

	it('handles empty and full transitions without special cases', () => {
		expect(delta([], ['a', 'b'])).toMatchObject({
			entered: ['a', 'b'],
			exited: [],
			retained: [],
		});
		expect(delta(['a', 'b'], [])).toMatchObject({
			entered: [],
			exited: ['a', 'b'],
			retained: [],
		});
	});

	it('reuses retained item identity and inserts only entered items', () => {
		const retained = { id: 'b' };
		const entered = { id: 'c' };

		const reconciled = reconcileFilterProjectionItems(
			['b', 'c'],
			new Map([['b', retained]]),
			new Map([['c', entered]]),
		);

		expect(reconciled).toEqual([retained, entered]);
		expect(reconciled?.[0]).toBe(retained);
		expect(reconciled?.[1]).toBe(entered);
	});

	it('rejects an incomplete item projection instead of partially patching', () => {
		expect(
			reconcileFilterProjectionItems(
				['known', 'missing'],
				new Map([['known', { id: 'known' }]]),
				new Map(),
			),
		).toBeNull();
	});

	it('keeps large narrowing work observable as delta-sized operation counts', () => {
		const previous = Array.from({ length: 10_000 }, (_, index) =>
			`note-${index}.md`,
		);
		const next = previous.filter((_, index) => index % 10 === 0);

		const result = delta(previous, next);

		expect(result).toMatchObject({
			safe: true,
			orderChanged: false,
		});
		expect(result.retained).toHaveLength(1_000);
		expect(result.exited).toHaveLength(9_000);
		expect(result.entered).toHaveLength(0);
	});
});

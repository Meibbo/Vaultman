import { describe, expect, it } from 'vitest';

import {
	collectExplorerDeletionIds,
	resolveExplorerHighlight,
	resolveExplorerStatusDots,
} from '../../src/logic/logicExplorerHighlight';

describe('U121-013 explorer highlight contract', () => {
	it.each([
		['hover', { hover: true }],
		['inclusive', { inclusive: true }],
		['exclusive', { exclusive: true }],
		['deletion', { deletion: true }],
	] as const)('keeps the %s channel independent', (channel, input) => {
		const resolved = resolveExplorerHighlight(input);

		expect(resolved[channel]).toBe(true);
		for (const other of ['hover', 'inclusive', 'exclusive', 'deletion'] as const) {
			if (other !== channel) expect(resolved[other]).toBe(false);
		}
	});

	it('preserves simultaneous inclusive, exclusive, deletion and hover state', () => {
		expect(
			resolveExplorerHighlight({
				hover: true,
				inclusive: true,
				exclusive: true,
				deletion: true,
			}),
		).toEqual({
			hover: true,
			inclusive: true,
			exclusive: true,
			deletion: true,
		});
	});

	it('emits inclusive and exclusive collapsed-descendant status independently', () => {
		expect(
			resolveExplorerStatusDots({ inclusive: true, exclusive: true }),
		).toEqual([
			{ channel: 'inclusive', tone: 'filter' },
			{ channel: 'exclusive', tone: 'filter-excluded' },
		]);
	});

	it('bounds status to two deterministic dots when three channels compete', () => {
		expect(
			resolveExplorerStatusDots({
				inclusive: true,
				exclusive: true,
				deletion: true,
			}),
		).toEqual([
			{ channel: 'deletion', tone: 'deletion' },
			{ channel: 'exclusive', tone: 'filter-excluded' },
		]);
	});

	it('does not turn hover into persistent status or operation badge data', () => {
		const dots = resolveExplorerStatusDots({ hover: true });

		expect(dots).toEqual([]);
		expect(dots.some((dot) => 'queueIndex' in dot || 'badge' in dot)).toBe(false);
	});

	// U121-077: the channel used to be derived from "has an own red badge",
	// which answered a different question than the one it was asked. It missed
	// every node dragged along by someone else's deletion -- the values of a
	// deleted property, the files inside a deleted folder -- and it caught the
	// parent property of a deleted value, which was not going anywhere. The
	// `is-deleted-*` class is each scene's resolved verdict, so read that.
	it('takes every node the queue will delete, badge or no badge', () => {
		const ids = collectExplorerDeletionIds([
			{
				id: 'prop',
				label: 'Prop',
				depth: 0,
				meta: {},
				cls: 'is-deleted-prop',
				badges: [{ color: 'red' }],
				children: [
					{
						id: 'value-doomed',
						label: 'goes with it',
						depth: 1,
						meta: {},
						// No badge of its own: the operation never named it, but
						// deleting the property takes it all the same.
						cls: 'is-deleted-value',
					},
				],
			},
		]);

		expect([...ids]).toEqual(['prop', 'value-doomed']);
	});

	it('leaves out a parent that only carries a bubbled badge', () => {
		const ids = collectExplorerDeletionIds([
			{
				id: 'parent',
				label: 'Parent',
				depth: 0,
				meta: {},
				// U121-072: the property node used to absorb its values' ops and
				// land here with a red badge of its own. It survives the queue.
				badges: [{ color: 'red', isInherited: true }],
				children: [
					{
						id: 'child',
						label: 'Child',
						depth: 1,
						meta: {},
						cls: 'is-deleted-value',
						badges: [{ color: 'red' }],
					},
				],
			},
		]);

		expect([...ids]).toEqual(['child']);
	});
});

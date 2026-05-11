import { describe, it, expect, vi } from 'vitest';
import { createNodeIndex } from '../../../src/index/indexNodeCreate';
import type { NodeBase } from '../../../src/types/typeContracts';

interface TestNode extends NodeBase {
	label: string;
}

describe('createNodeIndex', () => {
	it('rebuilds nodes via the supplied build fn', async () => {
		const build = vi.fn<() => TestNode[]>().mockReturnValue([
			{ id: 'a', label: 'A' },
			{ id: 'b', label: 'B' },
		]);
		const idx = createNodeIndex<TestNode>({ build });
		await idx.refresh();
		expect(idx.nodes.length).toBe(2);
		expect(idx.byId('a')?.label).toBe('A');
	});

	it('notifies subscribers on refresh', async () => {
		const build = vi.fn<() => TestNode[]>().mockReturnValue([{ id: 'a', label: 'A' }]);
		const idx = createNodeIndex<TestNode>({ build });
		const cb = vi.fn();
		const unsub = idx.subscribe(cb);
		await idx.refresh();
		expect(cb).toHaveBeenCalledTimes(1);
		unsub();
		await idx.refresh();
		expect(cb).toHaveBeenCalledTimes(1); // unsubscribed
	});

	it('increments revision only when a refresh publishes', async () => {
		const build = vi.fn<() => TestNode[]>().mockReturnValue([{ id: 'a', label: 'A' }]);
		const idx = createNodeIndex<TestNode>({ build });

		expect(idx.revision).toBe(0);
		await idx.refresh();
		expect(idx.revision).toBe(1);
		await idx.refresh();
		expect(idx.revision).toBe(2);
	});

	it('byId returns undefined for missing ids', async () => {
		const build = vi.fn<() => TestNode[]>().mockReturnValue([]);
		const idx = createNodeIndex<TestNode>({ build });
		await idx.refresh();
		expect(idx.byId('nope')).toBeUndefined();
	});

	it('publishes flat ids and normalized search buffers with custom search text', async () => {
		const build = vi.fn<() => TestNode[]>().mockReturnValue([
			{ id: 'a', label: 'Alpha Heading' },
			{ id: 'b', label: 'Beta Folder' },
		]);
		const idx = createNodeIndex<TestNode>({
			build,
			searchText: (node) => `${node.label}\n${node.id.toUpperCase()}`,
		});

		await idx.refresh();

		expect(idx.flatIds).toEqual(['a', 'b']);
		expect(idx.getSearchBuffer('a')).toBe('alpha heading\na');
		expect(idx.getSearchBuffer('missing')).toBe('');
	});
});

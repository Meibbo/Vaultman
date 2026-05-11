import { afterEach, describe, it, expect } from 'vitest';
import { ExplorerService } from '../../../src/services/serviceExplorer.svelte';
import { PerfMeter, type OpsLogRecord } from '../../../src/services/perfMeter';
import type { INodeIndex, IDecorationManager, NodeBase } from '../../../src/types/typeContracts';

function stubIdx<T extends NodeBase>(
	nodes: T[],
	searchText: (node: T) => string = (node) => (node as T & { label?: string }).label ?? node.id,
): INodeIndex<T> {
	const subs = new Set<() => void>();
	let revision = 0;
	return {
		get nodes() {
			return nodes;
		},
		get flatIds() {
			return nodes.map((node) => node.id);
		},
		get revision() {
			return revision;
		},
		refresh: async () => {
			revision += 1;
			for (const s of subs) s();
		},
		subscribe: (cb) => {
			subs.add(cb);
			return () => subs.delete(cb);
		},
		byId: (id) => nodes.find((n) => n.id === id),
		getSearchBuffer: (id) => {
			const node = nodes.find((item) => item.id === id);
			return node ? searchText(node).toLowerCase() : '';
		},
	};
}

const stubDecorate: IDecorationManager = {
	decorate: () => ({ icons: [], badges: [], highlights: [] }),
	subscribe: () => () => {},
};

describe('ExplorerService', () => {
	afterEach(() => {
		PerfMeter.__resetForTests();
	});

	it('exposes filtered nodes when search is set', () => {
		const idx = stubIdx([
			{ id: 'a', label: 'apple' } as NodeBase & { label: string },
			{ id: 'b', label: 'banana' } as NodeBase & { label: string },
		]);
		const svc = new ExplorerService({ index: idx, decorate: stubDecorate });
		svc.setSearch('app');
		expect(svc.filteredNodes.map((n) => n.id)).toEqual(['a']);
	});

	it('filters through normalized index buffers instead of lowercasing labels per render', () => {
		const idx = stubIdx(
			[
				{ id: 'a', label: 'visible label' } as NodeBase & { label: string },
				{ id: 'b', label: 'other label' } as NodeBase & { label: string },
			],
			(node) => (node.id === 'a' ? 'Adopted/Header/Path.md' : node.label),
		);
		const records: OpsLogRecord[] = [];
		PerfMeter.subscribe((record) => records.push(record));

		const svc = new ExplorerService({ index: idx, decorate: stubDecorate });
		svc.setSearch('HEADER');

		expect(svc.filteredIds).toEqual(['a']);
		expect(svc.filteredNodes.map((n) => n.id)).toEqual(['a']);
		expect(records.some((record) => record.label === 'explorer.service.filteredIds')).toBe(true);
	});

	it('toggleSelect drives selectedIds', () => {
		const svc = new ExplorerService({
			index: stubIdx([{ id: 'a' } as NodeBase]),
			decorate: stubDecorate,
		});
		svc.toggleSelect('a');
		expect(svc.selectedIds.has('a')).toBe(true);
	});

	it('clearSelection resets selectedIds', () => {
		const svc = new ExplorerService({
			index: stubIdx([{ id: 'a' } as NodeBase]),
			decorate: stubDecorate,
		});
		svc.toggleSelect('a');
		svc.clearSelection();
		expect(svc.selectedIds.size).toBe(0);
	});

	it('subscribe notifies when search changes', () => {
		const svc = new ExplorerService({ index: stubIdx([]), decorate: stubDecorate });
		let count = 0;
		svc.subscribe(() => count++);
		svc.setSearch('x');
		expect(count).toBeGreaterThan(0);
	});
});

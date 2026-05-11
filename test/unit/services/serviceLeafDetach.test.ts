import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LeafDetachService } from '../../../src/services/serviceLeafDetach';
import { PerfMeter } from '../../../src/services/perfMeter';

function makeStore(initial: Record<string, unknown> = {}) {
	let data: Record<string, unknown> = { ...initial };
	return {
		loadData: vi.fn(async () => ({ ...data })),
		saveData: vi.fn(async (next: unknown) => {
			data = { ...(next as Record<string, unknown>) };
		}),
		peek: () => data,
	};
}

function makeHost() {
	return {
		spawnLeaf: vi.fn(async (_tabId: string) => {}),
		closeLeaf: vi.fn(async (_tabId: string) => {}),
	};
}

describe('LeafDetachService', () => {
	beforeEach(() => {
		PerfMeter.__resetForTests();
	});

	it('loads empty state when plugin data has no independentLeaves key', async () => {
		const store = makeStore({ openMode: 'sidebar' });
		const host = makeHost();
		const svc = new LeafDetachService({ store, host });
		await svc.load();
		expect(svc.getState()).toEqual({});
		expect(svc.isDetached('explorer-files')).toBe(false);
	});

	it('detach() spawns a leaf, sets the flag, and persists via saveData', async () => {
		const store = makeStore({ foo: 1 });
		const host = makeHost();
		const svc = new LeafDetachService({ store, host });
		await svc.load();

		await svc.detach('explorer-files');

		expect(host.spawnLeaf).toHaveBeenCalledWith('explorer-files');
		expect(svc.isDetached('explorer-files')).toBe(true);
		// sibling field preserved, our key written
		const saved = store.peek();
		expect(saved.foo).toBe(1);
		expect((saved.independentLeaves as Record<string, boolean>)['explorer-files']).toBe(true);
	});

	it('attach() closes the leaf, clears the flag, and persists', async () => {
		const store = makeStore({ independentLeaves: { 'explorer-tags': true } });
		const host = makeHost();
		const svc = new LeafDetachService({ store, host });
		await svc.load();
		expect(svc.isDetached('explorer-tags')).toBe(true);

		await svc.attach('explorer-tags');

		expect(host.closeLeaf).toHaveBeenCalledWith('explorer-tags');
		expect(svc.isDetached('explorer-tags')).toBe(false);
		const saved = store.peek();
		expect((saved.independentLeaves as Record<string, boolean>)['explorer-tags']).toBe(false);
	});

	it('detach() is a no-op when already detached (no double spawn)', async () => {
		const store = makeStore({ independentLeaves: { queue: true } });
		const host = makeHost();
		const svc = new LeafDetachService({ store, host });
		await svc.load();

		await svc.detach('queue');
		await svc.detach('queue');

		expect(host.spawnLeaf).not.toHaveBeenCalled();
	});

	it('round-trips state across a fresh service instance', async () => {
		const store = makeStore();
		const host = makeHost();
		const a = new LeafDetachService({ store, host });
		await a.load();
		await a.detach('content');
		await a.detach('page-tools');

		const host2 = makeHost();
		const b = new LeafDetachService({ store, host: host2 });
		await b.load();

		expect(b.getState()).toEqual({ content: true, 'page-tools': true });
	});

	it('notifies subscribers with cloned state snapshots after load, detach, and attach', async () => {
		const store = makeStore({ independentLeaves: { content: true } });
		const host = makeHost();
		const svc = new LeafDetachService({ store, host });
		const snapshots: Array<Record<string, boolean | undefined>> = [];
		const off = svc.subscribe((state) => snapshots.push(state));

		await svc.load();
		await svc.detach('page-tools');
		await svc.attach('content');
		off();
		await svc.detach('queue');

		expect(snapshots).toEqual([
			{ content: true },
			{ content: true, 'page-tools': true },
			{ content: false, 'page-tools': true },
		]);
		expect(snapshots[1]).not.toBe(svc.getState());
	});

	it('restore() spawns one leaf per detached tab and is idempotent', async () => {
		const store = makeStore({
			independentLeaves: { 'explorer-files': true, queue: true, content: false },
		});
		const host = makeHost();
		const svc = new LeafDetachService({ store, host });
		await svc.load();

		await svc.restore();
		await svc.restore(); // second call must not double-spawn

		expect(host.spawnLeaf).toHaveBeenCalledTimes(2);
		const calls = host.spawnLeaf.mock.calls.map((c) => c[0]).sort();
		expect(calls).toEqual(['explorer-files', 'queue']);
	});

	it('detach() emits a PerfMeter record so phase-4 timing wrapping is real', async () => {
		const store = makeStore();
		const host = makeHost();
		const svc = new LeafDetachService({ store, host });
		await svc.load();

		const records: string[] = [];
		const off = PerfMeter.subscribe((r) => {
			records.push(r.label);
		});
		await svc.detach('explorer-props');
		off();

		expect(records).toContain('leaf:detach:explorer-props');
	});

	it('rejects non-detachable tab ids without spawning', async () => {
		const store = makeStore();
		const host = makeHost();
		const svc = new LeafDetachService({ store, host });
		await svc.load();
		// @ts-expect-error — intentionally wrong type to test runtime guard
		await svc.detach('not-a-tab');
		expect(host.spawnLeaf).not.toHaveBeenCalled();
	});
});

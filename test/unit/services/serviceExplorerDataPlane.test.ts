import { describe, expect, it, vi } from 'vitest';
import { ExplorerDataPlaneService } from '../../../src/services/serviceExplorerDataPlane.svelte';
import type {
	ExplorerDataPlaneRevisions,
	ExplorerSnapshot,
} from '../../../src/types/typeExplorerDataPlane';

function emptySnapshot(explorerId = 'files'): ExplorerSnapshot {
	const revisions: ExplorerDataPlaneRevisions = { filesRevision: 1 };
	return {
		explorerId,
		providerKey: explorerId,
		revision: 0,
		structureRevision: 0,
		rows: [],
		tree: [],
		visibleIds: [],
		byId: new Map(),
		idToIndex: new Map(),
		pathToId: new Map(),
		folderPathToId: new Map(),
		sourceRevisions: revisions,
	};
}

describe('ExplorerDataPlaneService', () => {
	it('returns undefined before any publish', () => {
		const svc = new ExplorerDataPlaneService();
		expect(svc.snapshot('files')).toBeUndefined();
	});

	it('publish stores the snapshot and increments revision per explorer', () => {
		const svc = new ExplorerDataPlaneService();
		svc.publish('files', emptySnapshot('files'));
		const first = svc.snapshot('files');
		expect(first?.revision).toBe(1);
		expect(first?.structureRevision).toBe(1);

		svc.publish('files', emptySnapshot('files'));
		const second = svc.snapshot('files');
		expect(second?.revision).toBe(2);
		expect(second?.structureRevision).toBe(2);
	});

	it('per-explorer subscribe fires only when matching explorerId publishes', () => {
		const svc = new ExplorerDataPlaneService();
		const filesCb = vi.fn();
		const tagsCb = vi.fn();
		svc.subscribe('files', filesCb);
		svc.subscribe('tags', tagsCb);

		svc.publish('files', emptySnapshot('files'));
		expect(filesCb).toHaveBeenCalledTimes(1);
		expect(tagsCb).toHaveBeenCalledTimes(0);

		svc.publish('tags', emptySnapshot('tags'));
		expect(filesCb).toHaveBeenCalledTimes(1);
		expect(tagsCb).toHaveBeenCalledTimes(1);
	});

	it('unsubscribe stops firing for that subscriber only', () => {
		const svc = new ExplorerDataPlaneService();
		const cb = vi.fn();
		const off = svc.subscribe('files', cb);
		svc.publish('files', emptySnapshot('files'));
		expect(cb).toHaveBeenCalledTimes(1);
		off();
		svc.publish('files', emptySnapshot('files'));
		expect(cb).toHaveBeenCalledTimes(1);
	});

	it('clear removes the snapshot and notifies subscribers once', () => {
		const svc = new ExplorerDataPlaneService();
		const cb = vi.fn();
		svc.subscribe('files', cb);
		svc.publish('files', emptySnapshot('files'));
		expect(svc.snapshot('files')).toBeDefined();
		svc.clear('files');
		expect(svc.snapshot('files')).toBeUndefined();
		expect(cb).toHaveBeenCalledTimes(2);
	});

	it('revision is per-explorer', () => {
		const svc = new ExplorerDataPlaneService();
		svc.publish('files', emptySnapshot('files'));
		svc.publish('tags', emptySnapshot('tags'));
		svc.publish('tags', emptySnapshot('tags'));
		expect(svc.snapshot('files')?.revision).toBe(1);
		expect(svc.snapshot('tags')?.revision).toBe(2);
	});

	it('returns the same reference across reads until next publish', () => {
		const svc = new ExplorerDataPlaneService();
		svc.publish('files', emptySnapshot('files'));
		const a = svc.snapshot('files');
		const b = svc.snapshot('files');
		expect(a).toBe(b);
	});
});

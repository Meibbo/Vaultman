import { describe, expect, it } from 'vitest';
import {
	executeGroupToFolder,
	planGroupToFolder,
	type GroupFolderAdapter,
	type GroupFolderMember,
} from '../../src/logic/logicGroupToFolder';
import {
	projectGroupedTree,
	resolveCustomGroups,
	NO_GROUP_ID,
	PRESET_GROUP_PREFIX,
} from '../../src/logic/logicTreeGroupProjection';
import type { TreeNode } from '../../src/types/typeTree';

function fakeVault(
	entries: GroupFolderMember[],
	opts?: { failMove?: string; postRenameThrow?: string; failRollback?: string },
) {
	const items = new Map(entries.map((entry) => [entry.path, entry.kind]));
	const calls: string[] = [];
	const adapter: GroupFolderAdapter = {
		stat: (path) => items.get(path) ?? null,
		createFolder: async (path) => {
			calls.push(`create:${path}`);
			if (items.has(path)) throw new Error('exists');
			items.set(path, 'folder');
		},
		move: async (from, to) => {
			calls.push(`move:${from}:${to}`);
			if (opts?.failRollback && from === opts.failRollback)
				throw new Error(`rollback failed on ${from}`);
			if (opts?.failMove && from === opts.failMove)
				throw new Error('injected move failure');
			if (opts?.postRenameThrow && from === opts.postRenameThrow) {
				const kind = items.get(from)!;
				items.delete(from);
				items.set(to, kind);
				throw new Error('injected post-rename throw');
			}
			const kind = items.get(from);
			if (!kind || items.has(to)) throw new Error('invalid move');
			items.delete(from);
			items.set(to, kind);
			if (kind === 'folder') {
				for (const [child, childKind] of [...items]) {
					if (!child.startsWith(`${from}/`)) continue;
					items.delete(child);
					items.set(`${to}${child.slice(from.length)}`, childKind);
				}
			}
		},
		deleteEmptyFolder: async (path) => {
			calls.push(`delete:${path}`);
			if ([...items.keys()].some((item) => item.startsWith(`${path}/`)))
				throw new Error('nonempty');
			items.delete(path);
		},
	};
	return { items, calls, adapter };
}

describe('U130-GGC-007 physical folder transaction', () => {
	it('moves mixed-parent files and a folder subtree once into one new folder', async () => {
		const members: GroupFolderMember[] = [
			{ path: 'A/one.md', kind: 'file' },
			{ path: 'B/two.md', kind: 'file' },
			{ path: 'C/Nested', kind: 'folder' },
			{ path: 'C/Nested/child.md', kind: 'file' },
			{ path: 'A/one.md', kind: 'file' },
		];
		const planned = planGroupToFolder('Output', members);
		expect(planned.ok).toBe(true);
		if (!planned.ok) return;
		expect(planned.plan.moves.map((move) => move.to)).toEqual([
			'Output/one.md', 'Output/two.md', 'Output/Nested',
		]);
		const vault = fakeVault(members);
		expect(await executeGroupToFolder(planned.plan, vault.adapter)).toEqual({ ok: true });
		expect(vault.items.has('Output/Nested/child.md')).toBe(true);
		expect(vault.items.has('C/Nested/child.md')).toBe(false);
	});

	it('refuses duplicate basenames and source/target cycles before writing', () => {
		expect(planGroupToFolder('Output', [
			{ path: 'A/same.md', kind: 'file' },
			{ path: 'B/same.md', kind: 'file' },
		])).toEqual({ ok: false, reason: 'duplicate_name:same.md' });
		expect(planGroupToFolder('A/New', [
			{ path: 'A', kind: 'folder' },
		])).toEqual({ ok: false, reason: 'folder_cycle:A' });
	});

	it('rechecks a stale preview and never creates a folder on collision', async () => {
		const planned = planGroupToFolder('Output', [{ path: 'A/one.md', kind: 'file' }]);
		if (!planned.ok) throw new Error('plan rejected');
		const vault = fakeVault([
			{ path: 'A/one.md', kind: 'file' },
			{ path: 'Output', kind: 'folder' },
		]);
		expect(await executeGroupToFolder(planned.plan, vault.adapter)).toMatchObject({
			ok: false, reason: 'target_exists:Output',
		});
		expect(vault.calls).toEqual([]);
	});

	it('restores already moved members and removes the empty destination after failure', async () => {
		const planned = planGroupToFolder('Output', [
			{ path: 'A/one.md', kind: 'file' },
			{ path: 'B/two.md', kind: 'file' },
		]);
		if (!planned.ok) throw new Error('plan rejected');
		const vault = fakeVault([
			{ path: 'A/one.md', kind: 'file' },
			{ path: 'B/two.md', kind: 'file' },
		], { failMove: 'B/two.md' });
		expect(await executeGroupToFolder(planned.plan, vault.adapter)).toMatchObject({
			ok: false, rollbackFailures: [],
		});
		expect([...vault.items].sort()).toEqual([
			['A/one.md', 'file'], ['B/two.md', 'file'],
		]);
		expect(vault.calls).toContain('delete:Output');
	});

	it('detects post-rename throws and rolls them back safely', async () => {
		const planned = planGroupToFolder('Output', [
			{ path: 'A/one.md', kind: 'file' },
			{ path: 'B/two.md', kind: 'file' },
		]);
		if (!planned.ok) throw new Error('plan rejected');
		const vault = fakeVault([
			{ path: 'A/one.md', kind: 'file' },
			{ path: 'B/two.md', kind: 'file' },
		], { postRenameThrow: 'B/two.md' });
		const result = await executeGroupToFolder(planned.plan, vault.adapter);
		expect(result.ok).toBe(false);
		if (result.ok) throw new Error('expected failure');
		expect(result.rollbackFailures).toEqual([]);
		// Both files should be restored to their original locations
		expect([...vault.items].sort()).toEqual([
			['A/one.md', 'file'], ['B/two.md', 'file'],
		]);
		expect(vault.calls).toContain('delete:Output');
	});

	it('records rollback failures and avoids deleting non-empty folder', async () => {
		const planned = planGroupToFolder('Output', [
			{ path: 'A/one.md', kind: 'file' },
			{ path: 'B/two.md', kind: 'file' },
		]);
		if (!planned.ok) throw new Error('plan rejected');
		const vault = fakeVault([
			{ path: 'A/one.md', kind: 'file' },
			{ path: 'B/two.md', kind: 'file' },
		], { failMove: 'B/two.md', failRollback: 'Output/one.md' });
		const result = await executeGroupToFolder(planned.plan, vault.adapter);
		expect(result.ok).toBe(false);
		if (result.ok) throw new Error('expected failure');
		expect(result.rollbackFailures.length).toBeGreaterThan(0);
		expect(result.rollbackFailures[0]).toContain('Output/one.md');
		// Output folder should not be deleted because rollback failed
		expect(vault.calls).not.toContain('delete:Output');
		expect(vault.items.has('Output/one.md')).toBe(true);
	});

	it('aborts before move on concurrent source disappearance or target appearance (race)', async () => {
		const planned = planGroupToFolder('Output', [
			{ path: 'A/one.md', kind: 'file' },
			{ path: 'B/two.md', kind: 'file' },
		]);
		if (!planned.ok) throw new Error('plan rejected');
		const vault = fakeVault([
			{ path: 'A/one.md', kind: 'file' },
			{ path: 'B/two.md', kind: 'file' },
		]);
		// Simulate target race: target file appears right after createFolder
		const origCreate = vault.adapter.createFolder;
		vault.adapter.createFolder = async (path: string) => {
			await origCreate(path);
			vault.items.set('Output/two.md', 'file'); // race: destination created concurrently
		};
		const result = await executeGroupToFolder(planned.plan, vault.adapter);
		expect(result.ok).toBe(false);
		if (result.ok) throw new Error('expected failure');
		expect(result.reason).toContain('target_exists:Output/two.md');
		expect(vault.items.get('A/one.md')).toBe('file');
	});

	it('handles empty member list and moves empty member folders correctly', async () => {
		expect(planGroupToFolder('Output', [])).toEqual({ ok: false, reason: 'empty_group' });

		const planned = planGroupToFolder('Output', [
			{ path: 'EmptyDir', kind: 'folder' },
			{ path: 'note.md', kind: 'file' },
		]);
		expect(planned.ok).toBe(true);
		if (!planned.ok) return;
		const vault = fakeVault([
			{ path: 'EmptyDir', kind: 'folder' },
			{ path: 'note.md', kind: 'file' },
		]);
		const result = await executeGroupToFolder(planned.plan, vault.adapter);
		expect(result.ok).toBe(true);
		expect(vault.items.get('Output/EmptyDir')).toBe('folder');
		expect(vault.items.get('Output/note.md')).toBe('file');
		expect(vault.items.has('EmptyDir')).toBe(false);
	});

	interface TestFileMeta {
		file: { path: string } | null;
		folder?: { path: string } | null;
		isFolder?: boolean;
		folderPath?: string;
	}

	it('preset projection: new folder replaces virtual group at its slot without disabling unrelated buckets', () => {
		const folderNode: TreeNode<TestFileMeta> = {
			id: 'folder:A',
			label: 'A',
			depth: 0,
			children: [
				{ id: 'A/Alpha.md', label: 'Alpha.md', depth: 1, children: [], meta: { file: { path: 'A/Alpha.md' }, isFolder: false } },
				{ id: 'A/Apple.md', label: 'Apple.md', depth: 1, children: [], meta: { file: { path: 'A/Apple.md' }, isFolder: false } },
			],
			meta: { file: null, folder: { path: 'A' }, isFolder: true, folderPath: 'A' },
		};
		const fileB: TreeNode<TestFileMeta> = {
			id: 'Beta.md',
			label: 'Beta.md',
			depth: 0,
			children: [],
			meta: { file: { path: 'Beta.md' }, isFolder: false },
		};

		const out = projectGroupedTree<TestFileMeta>({
			nodes: [folderNode, fileB],
			groups: [],
			memberships: {},
			providerId: 'files',
			noGroupLabel: 'No group',
			filtered: false,
			preset: { kind: 'letter', direction: 'asc' },
			convertedFolderPaths: new Set(['A']),
		});

		// folder:A should be at index 0 as a top-level node_folder, NOT inside a virtual group
		expect(out[0]?.id).toBe('folder:A');
		expect(out[0]?.isGroupHeader).toBeUndefined();
		expect(out[0]?.children?.map((c) => c.id)).toEqual(['A/Alpha.md', 'A/Apple.md']);

		// Bucket B should exist at index 1 and NOT be disabled
		expect(out[1]?.id).toBe(`${PRESET_GROUP_PREFIX}B`);
		expect(out[1]?.isGroupHeader).toBe(true);
		expect(out[1]?.children?.map((c) => c.id)).toEqual(['Beta.md']);

		// No items should be dumped into No group
		expect(out.find((n) => n.id === NO_GROUP_ID)).toBeUndefined();
	});

	it('preset projection: retains bucket header when unrelated member of same bucket exists', () => {
		const folderNode: TreeNode<TestFileMeta> = {
			id: 'folder:A',
			label: 'A',
			depth: 0,
			children: [
				{ id: 'A/Alpha.md', label: 'Alpha.md', depth: 1, children: [], meta: { file: { path: 'A/Alpha.md' }, isFolder: false } },
			],
			meta: { file: null, folder: { path: 'A' }, isFolder: true, folderPath: 'A' },
		};
		const fileAvocado: TreeNode<TestFileMeta> = {
			id: 'Avocado.md',
			label: 'Avocado.md',
			depth: 0,
			children: [],
			meta: { file: { path: 'Avocado.md' }, isFolder: false },
		};
		const fileB: TreeNode<TestFileMeta> = {
			id: 'Beta.md',
			label: 'Beta.md',
			depth: 0,
			children: [],
			meta: { file: { path: 'Beta.md' }, isFolder: false },
		};

		const out = projectGroupedTree<TestFileMeta>({
			nodes: [folderNode, fileAvocado, fileB],
			groups: [],
			memberships: {},
			providerId: 'files',
			noGroupLabel: 'No group',
			filtered: false,
			preset: { kind: 'letter', direction: 'asc' },
			convertedFolderPaths: new Set(['A']),
		});

		// folder:A is at index 0
		expect(out[0]?.id).toBe('folder:A');
		expect(out[0]?.isGroupHeader).toBeUndefined();

		// Header A exists for Avocado.md
		const headerA = out.find((n) => n.id === `${PRESET_GROUP_PREFIX}A`);
		expect(headerA).toBeDefined();
		expect(headerA?.children?.map((c) => c.id)).toEqual(['Avocado.md']);

		// Header B exists for Beta.md
		const headerB = out.find((n) => n.id === `${PRESET_GROUP_PREFIX}B`);
		expect(headerB).toBeDefined();
		expect(headerB?.children?.map((c) => c.id)).toEqual(['Beta.md']);
	});

	it('custom group projection: converted folder replaces custom group at its slot and is not put in no group', () => {
		const folderNode: TreeNode<TestFileMeta> = {
			id: 'folder:F1',
			label: 'F1',
			depth: 0,
			children: [
				{ id: 'F1/child.md', label: 'child.md', depth: 1, children: [], meta: { file: { path: 'F1/child.md' }, isFolder: false } },
			],
			meta: { file: null, folder: { path: 'F1' }, isFolder: true, folderPath: 'F1' },
		};
		const fileG2: TreeNode<TestFileMeta> = {
			id: 'other.md',
			label: 'other.md',
			depth: 0,
			children: [],
			meta: { file: { path: 'other.md' }, isFolder: false },
		};

		const memberships = {
			G2: ['files:file:other.md|other.md'],
		};
		const out = projectGroupedTree<TestFileMeta>({
			nodes: [folderNode, fileG2],
			groups: resolveCustomGroups(memberships),
			memberships,
			providerId: 'files',
			urnOf: (node) => `files:file:${node.id}|${node.label}`,
			noGroupLabel: 'No group',
			filtered: false,
			preset: { kind: 'custom', direction: 'asc' },
			convertedFolderPaths: new Set(['F1']),
		});

		// folder:F1 should be a top-level node, NOT inside No group
		expect(out.some((n) => n.id === 'folder:F1')).toBe(true);
		const noGroup = out.find((n) => n.id === NO_GROUP_ID);
		expect(noGroup?.children?.some((c) => c.id.includes('F1'))).toBeFalsy();
		// G2 should still group other.md
		const g2 = out.find((n) => n.id === 'G2');
		expect(g2).toBeDefined();
		expect(g2?.children?.map((c) => c.id)).toEqual(['other.md']);
	});
});

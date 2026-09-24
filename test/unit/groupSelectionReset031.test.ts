import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
	__resetGroupSelectionTokens,
	captureGroupSelectionSnapshot,
	noteSelectionState,
	reconcileCommittedGroupCreation,
	reconcileCommittedSelection,
} from '../../src/logic/logicGroupSelectionTransaction';
import { FilesExplorerPanel } from '../../src/components/containers/explorerFiles';
import { PropsExplorerPanel } from '../../src/components/containers/explorerProps';
import { TagsExplorerPanel } from '../../src/components/containers/explorerTags';
import { PluginsExplorerPanel } from '../../src/components/containers/explorerPlugins';
import { SnippetsExplorerPanel } from '../../src/components/containers/explorerSnippets';

describe('U130-GGC-031 — Selection reset post Group committed', () => {
	beforeEach(() => {
		__resetGroupSelectionTokens();
	});

	describe('reconcileCommittedGroupCreation helper', () => {
		it('G1 {A, B} committed vacía la selección a 0', () => {
			const key = 'inst1:files:files';
			const selected = new Set(['A', 'B']);
			const snapshot = captureGroupSelectionSnapshot({
				selectionKey: key,
				rowIds: ['A', 'B'],
				entityIds: ['A', 'B'],
				urns: ['files:file:A|A', 'files:file:B|B'],
				providerId: 'files',
				scene: 'files',
				instanceId: 'inst1',
				revision: 1,
			});

			const next = reconcileCommittedGroupCreation(
				snapshot,
				{ status: 'committed', groupId: 'G1', affectedUrns: ['files:file:A|A', 'files:file:B|B'] },
				selected,
				{ instanceId: 'inst1', revision: 1 },
			);

			expect(next.size).toBe(0);
			expect([...next]).toEqual([]);
		});

		it('G1 seguido de G2: G2 solo tiene {C, D} y tras commit queda a 0', () => {
			const key = 'inst1:files:files';
			// G1 commit
			const selected1 = new Set(['A', 'B']);
			const snapshot1 = captureGroupSelectionSnapshot({
				selectionKey: key,
				rowIds: ['A', 'B'],
				entityIds: ['A', 'B'],
				urns: ['files:file:A|A', 'files:file:B|B'],
				providerId: 'files',
				scene: 'files',
				instanceId: 'inst1',
				revision: 1,
			});
			const afterG1 = reconcileCommittedGroupCreation(
				snapshot1,
				{ status: 'committed', groupId: 'G1', affectedUrns: ['files:file:A|A', 'files:file:B|B'] },
				selected1,
				{ instanceId: 'inst1', revision: 1 },
			);
			expect(afterG1.size).toBe(0);

			// Nueva selección para G2
			const selected2 = new Set(['C', 'D']);
			const snapshot2 = captureGroupSelectionSnapshot({
				selectionKey: key,
				rowIds: ['C', 'D'],
				entityIds: ['C', 'D'],
				urns: ['files:file:C|C', 'files:file:D|D'],
				providerId: 'files',
				scene: 'files',
				instanceId: 'inst1',
				revision: 1,
			});
			expect(snapshot2.rowIds).toEqual(['C', 'D']);
			expect(snapshot2.entityIds).toEqual(['C', 'D']);

			const afterG2 = reconcileCommittedGroupCreation(
				snapshot2,
				{ status: 'committed', groupId: 'G2', affectedUrns: ['files:file:C|C', 'files:file:D|D'] },
				selected2,
				{ instanceId: 'inst1', revision: 1 },
			);
			expect(afterG2.size).toBe(0);
		});

		it('cancel y reject conservan la selección exacta sin vaciarla', () => {
			const key = 'inst1:props:props';
			const selected = new Set(['P1', 'P2']);
			const snapshot = captureGroupSelectionSnapshot({
				selectionKey: key,
				rowIds: ['P1', 'P2'],
				entityIds: ['P1', 'P2'],
				urns: ['props:prop:P1|P1', 'props:prop:P2|P2'],
				providerId: 'props',
				scene: 'props',
				instanceId: 'inst1',
				revision: 2,
			});

			const cancelledResult = reconcileCommittedGroupCreation(
				snapshot,
				{ status: 'cancelled' },
				selected,
				{ instanceId: 'inst1', revision: 2 },
			);
			expect(cancelledResult).toBe(selected);
			expect([...cancelledResult]).toEqual(['P1', 'P2']);

			const rejectedResult = reconcileCommittedGroupCreation(
				snapshot,
				{ status: 'rejected', reason: 'validation error' },
				selected,
				{ instanceId: 'inst1', revision: 2 },
			);
			expect(rejectedResult).toBe(selected);
			expect([...rejectedResult]).toEqual(['P1', 'P2']);
		});

		it('selección añadida durante espera del modal no sobrevive al commit del owner', () => {
			const key = 'inst1:tags:tags';
			const snapshot = captureGroupSelectionSnapshot({
				selectionKey: key,
				rowIds: ['T1', 'T2'],
				entityIds: ['T1', 'T2'],
				urns: ['tags:tag:T1|T1', 'tags:tag:T2|T2'],
				providerId: 'tags',
				scene: 'tags',
				instanceId: 'inst1',
				revision: 1,
			});

			// Usuario añade E durante la espera del modal
			const concurrentSelected = new Set(['T1', 'T2', 'E']);
			noteSelectionState(key, concurrentSelected);

			// Snapshot nunca contuvo E
			expect(snapshot.rowIds).not.toContain('E');

			// Tras resolver committed, el owner queda a 0
			const next = reconcileCommittedGroupCreation(
				snapshot,
				{ status: 'committed', groupId: 'G1', affectedUrns: ['tags:tag:T1|T1', 'tags:tag:T2|T2'] },
				concurrentSelected,
				{ instanceId: 'inst1', revision: 1 },
			);
			expect(next.size).toBe(0);
		});

		it('no limpia otra instancia o panel si la revisión o instancia no coincide', () => {
			const snapshot = captureGroupSelectionSnapshot({
				selectionKey: 'inst1:snippets:snippets',
				rowIds: ['S1'],
				entityIds: ['S1'],
				urns: ['snippets:snippet:S1|S1'],
				providerId: 'snippets',
				scene: 'snippets',
				instanceId: 'inst1',
				revision: 1,
			});
			const otherInstanceSelection = new Set(['S1', 'S2']);

			// Instancia diferente
			const resDifferentInstance = reconcileCommittedGroupCreation(
				snapshot,
				{ status: 'committed', groupId: 'G1', affectedUrns: ['snippets:snippet:S1|S1'] },
				otherInstanceSelection,
				{ instanceId: 'inst2', revision: 1 },
			);
			expect(resDifferentInstance).toBe(otherInstanceSelection);

			// Revisión diferente (panel desmontado/reemplazado)
			const resDifferentRevision = reconcileCommittedGroupCreation(
				snapshot,
				{ status: 'committed', groupId: 'G1', affectedUrns: ['snippets:snippet:S1|S1'] },
				otherInstanceSelection,
				{ instanceId: 'inst1', revision: 2 },
			);
			expect(resDifferentRevision).toBe(otherInstanceSelection);
		});

		it('reconcileCommittedSelection genérico con clearAllOnCommit emula el reset completo', () => {
			const key = 'inst1:plugins:plugins';
			const selected = new Set(['plug1', 'plug2']);
			const snapshot = captureGroupSelectionSnapshot({
				selectionKey: key,
				rowIds: ['plug1', 'plug2'],
				entityIds: ['plug1', 'plug2'],
				urns: ['plugins:plugin:plug1|plug1', 'plugins:plugin:plug2|plug2'],
				providerId: 'plugins',
				scene: 'plugins',
				instanceId: 'inst1',
				revision: 1,
			});

			const next = reconcileCommittedSelection(
				snapshot,
				{ status: 'committed', groupId: 'G1', affectedUrns: ['plugins:plugin:plug1|plug1'] },
				selected,
				{ instanceId: 'inst1', revision: 1 },
				{ clearAllOnCommit: true },
			);
			expect(next.size).toBe(0);
		});
	});

	describe('Wiring en exploradores', () => {
		it('FilesExplorerPanel: committed limpia selectedFilePaths y selectionAnchorPath', async () => {
			const panel = Object.create(FilesExplorerPanel.prototype) as any;
			panel.selectionInstanceId = 'files-inst';
			panel.selectionRevision = 1;
			panel.selectedFilePaths = new Set(['doc1.md', 'doc2.md']);
			panel.selectionAnchorPath = 'doc1.md';
			panel._groupIds = new Set();
			panel._lastRenderTree = [
				{ id: 'doc1.md', label: 'doc1.md', depth: 0, meta: { file: { path: 'doc1.md' } } },
				{ id: 'doc2.md', label: 'doc2.md', depth: 0, meta: { file: { path: 'doc2.md' } } },
			];
			panel.projectedNodes = (t: any) => t;
			panel._membershipUrnOf = (n: any) => `files:file:${n.id}|${n.id}`;
			panel._selectionKey = () => 'files-inst:files:files';
			panel.tableView = { setSelectedPaths: vi.fn() };
			panel.cardsView = { setSelectedPaths: vi.fn() };
			panel._renderTreeSelectionClasses = vi.fn();
			panel.plugin = { filterService: { setSelectedFiles: vi.fn() } };
			panel.getSelectedFiles = () => [];

			const handler = vi.fn(async () => ({
				status: 'committed' as const,
				groupId: 'FolderGroup',
				affectedUrns: ['files:file:doc1.md|doc1.md', 'files:file:doc2.md|doc2.md'],
			}));
			panel.createGroupHandler = handler;

			const ctx = panel._groupCreationMenuCtx();
			expect(ctx).toHaveProperty('createGroupWithSelected');
			const result = await ctx.createGroupWithSelected();

			expect(result.status).toBe('committed');
			expect(panel.selectedFilePaths.size).toBe(0);
			expect(panel.selectionAnchorPath).toBeNull();
			expect(panel.tableView.setSelectedPaths).toHaveBeenCalledWith(expect.any(Set));
		});

		it('PropsExplorerPanel: committed limpia selectedNodeIds y selectionAnchorId', async () => {
			const panel = Object.create(PropsExplorerPanel.prototype) as any;
			panel.selectionInstanceId = 'props-inst';
			panel.selectionRevision = 1;
			panel.selectedNodeIds = new Set(['propA', 'propB']);
			panel.selectionAnchorId = 'propA';
			panel._groupIds = new Set();
			panel._lastRenderTree = [
				{ id: 'propA', label: 'propA', depth: 0, meta: { isValueNode: false } },
				{ id: 'propB', label: 'propB', depth: 0, meta: { isValueNode: false } },
			];
			panel.projectedNodes = (t: any) => t;
			panel._membershipUrnOf = (n: any) => `props:prop:${n.id}|${n.id}`;
			panel._selectionKey = () => 'props-inst:props:props';
			panel._render = vi.fn();

			const handler = vi.fn(async () => ({
				status: 'committed' as const,
				groupId: 'PropGroup',
				affectedUrns: ['props:prop:propA|propA', 'props:prop:propB|propB'],
			}));
			panel.createGroupHandler = handler;

			const ctx = panel._groupCreationMenuCtx();
			expect(ctx).toHaveProperty('createGroupWithSelected');
			const result = await ctx.createGroupWithSelected();

			expect(result.status).toBe('committed');
			expect(panel.selectedNodeIds.size).toBe(0);
			expect(panel.selectionAnchorId).toBeNull();
			expect(panel._render).toHaveBeenCalled();
		});

		it('TagsExplorerPanel: committed limpia selectedNodeIds y selectionAnchorId', async () => {
			const panel = Object.create(TagsExplorerPanel.prototype) as any;
			panel.selectionInstanceId = 'tags-inst';
			panel.selectionRevision = 1;
			panel.selectedNodeIds = new Set(['tag1', 'tag2']);
			panel.selectionAnchorId = 'tag1';
			panel._groupIds = new Set();
			panel.groupPreset = { kind: 'none' };
			panel.projectedNodes = (t: any) => t;
			panel._lastRenderTree = [
				{ id: 'tag1', label: 'tag1', depth: 0, meta: {} },
				{ id: 'tag2', label: 'tag2', depth: 0, meta: {} },
			];
			panel._membershipUrnOf = (n: any) => `tags:tag:${n.id}|${n.id}`;
			panel._selectionKey = () => 'tags-inst:tags:tags';
			panel._render = vi.fn();

			const handler = vi.fn(async () => ({
				status: 'committed' as const,
				groupId: 'TagGroup',
				affectedUrns: ['tags:tag:tag1|tag1', 'tags:tag:tag2|tag2'],
			}));
			panel.createGroupHandler = handler;

			const ctx = panel._groupCreationMenuCtx();
			expect(ctx).toHaveProperty('createGroupWithSelected');
			const result = await ctx.createGroupWithSelected();

			expect(result.status).toBe('committed');
			expect(panel.selectedNodeIds.size).toBe(0);
			expect(panel.selectionAnchorId).toBeNull();
		});

		it('PluginsExplorerPanel: committed limpia selectedNodeIds y selectionAnchorId', async () => {
			const panel = Object.create(PluginsExplorerPanel.prototype) as any;
			panel.selectionInstanceId = 'plugins-inst';
			panel.selectionRevision = 1;
			panel.selectedNodeIds = new Set(['p1', 'p2']);
			panel.selectionAnchorId = 'p1';
			panel._groupIds = new Set();
			panel._lastProjectedTree = [
				{ id: 'p1', label: 'p1', depth: 0, meta: {} },
				{ id: 'p2', label: 'p2', depth: 0, meta: {} },
			];
			panel.nodes = panel._lastProjectedTree;
			panel._membershipUrnOf = (n: any) => `plugins:plugin:${n.id}|${n.id}`;
			panel._selectionKey = () => 'plugins-inst:plugins:plugins';
			panel.render = vi.fn();

			const handler = vi.fn(async () => ({
				status: 'committed' as const,
				groupId: 'PlugGroup',
				affectedUrns: ['plugins:plugin:p1|p1', 'plugins:plugin:p2|p2'],
			}));
			panel.createGroupHandler = handler;

			const ctx = panel._groupCreationMenuCtx();
			expect(ctx).toHaveProperty('createGroupWithSelected');
			const result = await ctx.createGroupWithSelected();

			expect(result.status).toBe('committed');
			expect(panel.selectedNodeIds.size).toBe(0);
			expect(panel.selectionAnchorId).toBeNull();
		});

		it('SnippetsExplorerPanel: committed limpia selectedNodeIds y selectionAnchorId', async () => {
			const panel = Object.create(SnippetsExplorerPanel.prototype) as any;
			panel.selectionInstanceId = 'snippets-inst';
			panel.selectionRevision = 1;
			panel.selectedNodeIds = new Set(['s1', 's2']);
			panel.selectionAnchorId = 's1';
			panel._groupIds = new Set();
			panel._lastProjectedTree = [
				{ id: 's1', label: 's1', depth: 0, meta: {} },
				{ id: 's2', label: 's2', depth: 0, meta: {} },
			];
			panel.nodes = panel._lastProjectedTree;
			panel._membershipUrnOf = (n: any) => `snippets:snippet:${n.id}|${n.id}`;
			panel._selectionKey = () => 'snippets-inst:snippets:snippets';
			panel.render = vi.fn();

			const handler = vi.fn(async () => ({
				status: 'committed' as const,
				groupId: 'SnipGroup',
				affectedUrns: ['snippets:snippet:s1|s1', 'snippets:snippet:s2|s2'],
			}));
			panel.createGroupHandler = handler;

			const ctx = panel._groupCreationMenuCtx();
			expect(ctx).toHaveProperty('createGroupWithSelected');
			const result = await ctx.createGroupWithSelected();

			expect(result.status).toBe('committed');
			expect(panel.selectedNodeIds.size).toBe(0);
			expect(panel.selectionAnchorId).toBeNull();
		});
	});
});

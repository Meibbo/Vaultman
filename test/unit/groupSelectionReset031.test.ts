import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
	__resetGroupSelectionTokens,
	captureGroupSelectionSnapshot,
	noteSelectionState,
	reconcileCommittedGroupCreation,
	reconcileCommittedSelection,
	type CreateGroupHandler,
	type GroupMutationResult,
} from '../../src/logic/logicGroupSelectionTransaction';
import { FilesExplorerPanel } from '../../src/components/containers/explorerFiles';
import { PropsExplorerPanel } from '../../src/components/containers/explorerProps';
import { TagsExplorerPanel } from '../../src/components/containers/explorerTags';
import { PluginsExplorerPanel } from '../../src/components/containers/explorerPlugins';
import { SnippetsExplorerPanel } from '../../src/components/containers/explorerSnippets';

interface TestTreeNode {
	id: string;
	label: string;
	depth: number;
	meta: Record<string, unknown>;
}

interface GroupCreationPanelHarness {
	_groupCreationMenuCtx(): {
		createGroupWithSelected?: () => Promise<GroupMutationResult>;
	};
}

function createPanelHarness(
	prototype: object,
	isExpectedPanel: (value: unknown) => value is GroupCreationPanelHarness,
): GroupCreationPanelHarness {
	const candidate: unknown = Object.create(prototype);
	if (!isExpectedPanel(candidate)) {
		throw new TypeError('Panel harness has an unexpected prototype');
	}
	return candidate;
}

function committedHandler(
	groupId: string,
	affectedUrns: readonly string[],
): CreateGroupHandler {
	return vi.fn(async (): Promise<GroupMutationResult> => ({
		status: 'committed',
		groupId,
		affectedUrns,
	}));
}

function requireCreateGroup(
	context: ReturnType<GroupCreationPanelHarness['_groupCreationMenuCtx']>,
): () => Promise<GroupMutationResult> {
	expect(context).toHaveProperty('createGroupWithSelected');
	const createGroupWithSelected = context.createGroupWithSelected;
	if (!createGroupWithSelected) {
		throw new TypeError('Expected createGroupWithSelected to be available');
	}
	return createGroupWithSelected;
}

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
			const panel = Object.assign(
				createPanelHarness(
					FilesExplorerPanel.prototype,
					(value): value is GroupCreationPanelHarness =>
						value instanceof FilesExplorerPanel,
				),
				{
					selectionInstanceId: 'files-inst',
					selectionRevision: 1,
					selectedFilePaths: new Set(['doc1.md', 'doc2.md']),
					selectionAnchorPath: 'doc1.md',
					_groupIds: new Set<string>(),
					_lastRenderTree: [
						{ id: 'doc1.md', label: 'doc1.md', depth: 0, meta: { file: { path: 'doc1.md' } } },
						{ id: 'doc2.md', label: 'doc2.md', depth: 0, meta: { file: { path: 'doc2.md' } } },
					] satisfies TestTreeNode[],
					projectedNodes: (nodes: TestTreeNode[]): TestTreeNode[] => nodes,
					_membershipUrnOf: (node: TestTreeNode): string =>
						`files:file:${node.id}|${node.id}`,
					_selectionKey: (): string => 'files-inst:files:files',
					tableView: { setSelectedPaths: vi.fn() },
					cardsView: { setSelectedPaths: vi.fn() },
					_renderTreeSelectionClasses: vi.fn(),
					plugin: { filterService: { setSelectedFiles: vi.fn() } },
					getSelectedFiles: (): never[] => [],
					createGroupHandler: committedHandler('FolderGroup', [
						'files:file:doc1.md|doc1.md',
						'files:file:doc2.md|doc2.md',
					]),
				},
			);

			const ctx = panel._groupCreationMenuCtx();
			const result = await requireCreateGroup(ctx)();

			expect(result.status).toBe('committed');
			expect(panel.selectedFilePaths.size).toBe(0);
			expect(panel.selectionAnchorPath).toBeNull();
			expect(panel.tableView.setSelectedPaths).toHaveBeenCalledWith(expect.any(Set));
		});

		it('PropsExplorerPanel: committed limpia selectedNodeIds y selectionAnchorId', async () => {
			const panel = Object.assign(
				createPanelHarness(
					PropsExplorerPanel.prototype,
					(value): value is GroupCreationPanelHarness =>
						value instanceof PropsExplorerPanel,
				),
				{
					selectionInstanceId: 'props-inst',
					selectionRevision: 1,
					selectedNodeIds: new Set(['propA', 'propB']),
					selectionAnchorId: 'propA',
					_groupIds: new Set<string>(),
					_lastRenderTree: [
						{ id: 'propA', label: 'propA', depth: 0, meta: { isValueNode: false } },
						{ id: 'propB', label: 'propB', depth: 0, meta: { isValueNode: false } },
					] satisfies TestTreeNode[],
					projectedNodes: (nodes: TestTreeNode[]): TestTreeNode[] => nodes,
					_membershipUrnOf: (node: TestTreeNode): string =>
						`props:prop:${node.id}|${node.id}`,
					_selectionKey: (): string => 'props-inst:props:props',
					_render: vi.fn(),
					createGroupHandler: committedHandler('PropGroup', [
						'props:prop:propA|propA',
						'props:prop:propB|propB',
					]),
				},
			);

			const ctx = panel._groupCreationMenuCtx();
			const result = await requireCreateGroup(ctx)();

			expect(result.status).toBe('committed');
			expect(panel.selectedNodeIds.size).toBe(0);
			expect(panel.selectionAnchorId).toBeNull();
			expect(panel._render).toHaveBeenCalled();
		});

		it('TagsExplorerPanel: committed limpia selectedNodeIds y selectionAnchorId', async () => {
			const panel = Object.assign(
				createPanelHarness(
					TagsExplorerPanel.prototype,
					(value): value is GroupCreationPanelHarness =>
						value instanceof TagsExplorerPanel,
				),
				{
					selectionInstanceId: 'tags-inst',
					selectionRevision: 1,
					selectedNodeIds: new Set(['tag1', 'tag2']),
					selectionAnchorId: 'tag1',
					_groupIds: new Set<string>(),
					groupPreset: { kind: 'none' as const },
					projectedNodes: (nodes: TestTreeNode[]): TestTreeNode[] => nodes,
					_lastRenderTree: [
						{ id: 'tag1', label: 'tag1', depth: 0, meta: {} },
						{ id: 'tag2', label: 'tag2', depth: 0, meta: {} },
					] satisfies TestTreeNode[],
					_membershipUrnOf: (node: TestTreeNode): string =>
						`tags:tag:${node.id}|${node.id}`,
					_selectionKey: (): string => 'tags-inst:tags:tags',
					_render: vi.fn(),
					createGroupHandler: committedHandler('TagGroup', [
						'tags:tag:tag1|tag1',
						'tags:tag:tag2|tag2',
					]),
				},
			);

			const ctx = panel._groupCreationMenuCtx();
			const result = await requireCreateGroup(ctx)();

			expect(result.status).toBe('committed');
			expect(panel.selectedNodeIds.size).toBe(0);
			expect(panel.selectionAnchorId).toBeNull();
		});

		it('PluginsExplorerPanel: committed limpia selectedNodeIds y selectionAnchorId', async () => {
			const projectedTree: TestTreeNode[] = [
				{ id: 'p1', label: 'p1', depth: 0, meta: {} },
				{ id: 'p2', label: 'p2', depth: 0, meta: {} },
			];
			const panel = Object.assign(
				createPanelHarness(
					PluginsExplorerPanel.prototype,
					(value): value is GroupCreationPanelHarness =>
						value instanceof PluginsExplorerPanel,
				),
				{
					selectionInstanceId: 'plugins-inst',
					selectionRevision: 1,
					selectedNodeIds: new Set(['p1', 'p2']),
					selectionAnchorId: 'p1',
					_groupIds: new Set<string>(),
					_lastProjectedTree: projectedTree,
					nodes: projectedTree,
					_membershipUrnOf: (node: TestTreeNode): string =>
						`plugins:plugin:${node.id}|${node.id}`,
					_selectionKey: (): string => 'plugins-inst:plugins:plugins',
					render: vi.fn(),
					createGroupHandler: committedHandler('PlugGroup', [
						'plugins:plugin:p1|p1',
						'plugins:plugin:p2|p2',
					]),
				},
			);

			const ctx = panel._groupCreationMenuCtx();
			const result = await requireCreateGroup(ctx)();

			expect(result.status).toBe('committed');
			expect(panel.selectedNodeIds.size).toBe(0);
			expect(panel.selectionAnchorId).toBeNull();
		});

		it('SnippetsExplorerPanel: committed limpia selectedNodeIds y selectionAnchorId', async () => {
			const projectedTree: TestTreeNode[] = [
				{ id: 's1', label: 's1', depth: 0, meta: {} },
				{ id: 's2', label: 's2', depth: 0, meta: {} },
			];
			const panel = Object.assign(
				createPanelHarness(
					SnippetsExplorerPanel.prototype,
					(value): value is GroupCreationPanelHarness =>
						value instanceof SnippetsExplorerPanel,
				),
				{
					selectionInstanceId: 'snippets-inst',
					selectionRevision: 1,
					selectedNodeIds: new Set(['s1', 's2']),
					selectionAnchorId: 's1',
					_groupIds: new Set<string>(),
					_lastProjectedTree: projectedTree,
					nodes: projectedTree,
					_membershipUrnOf: (node: TestTreeNode): string =>
						`snippets:snippet:${node.id}|${node.id}`,
					_selectionKey: (): string => 'snippets-inst:snippets:snippets',
					render: vi.fn(),
					createGroupHandler: committedHandler('SnipGroup', [
						'snippets:snippet:s1|s1',
						'snippets:snippet:s2|s2',
					]),
				},
			);

			const ctx = panel._groupCreationMenuCtx();
			const result = await requireCreateGroup(ctx)();

			expect(result.status).toBe('committed');
			expect(panel.selectedNodeIds.size).toBe(0);
			expect(panel.selectionAnchorId).toBeNull();
		});
	});
});

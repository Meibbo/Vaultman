import { describe, expect, it, vi } from 'vitest';
import { explorerContent } from '../../../src/components/containers/explorerContent';
import type { VaultmanPlugin } from '../../../src/main';
import type {
	ExplorerDataPlaneRevisions,
	ExplorerSnapshot,
} from '../../../src/types/typeExplorerDataPlane';
import type { ContentMatch } from '../../../src/types/typeContracts';
import type { ContentMeta, TreeNode } from '../../../src/types/typeNode';
import { mockApp, mockTFile, type TFile } from '../../helpers/obsidian-mocks';

type SnapshotBackedContent = explorerContent & {
	getStructuralTree(): TreeNode<ContentMeta>[];
	getStructuralRevisions(): ExplorerDataPlaneRevisions;
	getSnapshot(expandedIds: ReadonlySet<string>): ExplorerSnapshot<ContentMeta>;
};

function match(id: string, filePath: string, line: number, hit: string): ContentMatch {
	return { id, filePath, line, before: '', match: hit, after: '' };
}

function makePlugin(
	matches: ContentMatch[],
	options: { revision?: number } = {},
): VaultmanPlugin {
	const paths = [...new Set(matches.map((m) => m.filePath))];
	const files = paths.map((p) => mockTFile(p)) as TFile[];
	const app = mockApp({ files });

	return {
		app,
		contextMenuService: { registerAction: vi.fn(), openPanelMenu: vi.fn() },
		queueService: { queue: [], add: vi.fn() },
		contentIndex: {
			nodes: matches,
			flatIds: matches.map((m) => m.id),
			revision: options.revision ?? 7,
			refresh: vi.fn(),
			subscribe: vi.fn(() => vi.fn()),
			byId: vi.fn(),
			getSearchBuffer: vi.fn(() => ''),
			status: { query: '', phase: 'idle', scanned: 0, total: 0, resultCount: 0 },
			setQuery: vi.fn(),
		},
		operationsIndex: {
			nodes: [],
			revision: 0,
			refresh: vi.fn(),
			subscribe: vi.fn(),
			byId: vi.fn(),
			getSearchBuffer: vi.fn(() => ''),
		},
		activeFiltersIndex: {
			nodes: [],
			revision: 0,
			refresh: vi.fn(),
			subscribe: vi.fn(),
			byId: vi.fn(),
			getSearchBuffer: vi.fn(() => ''),
		},
		viewService: { getModel: vi.fn() },
	} as unknown as VaultmanPlugin;
}

describe('explorerContent snapshot adapter', () => {
	it('builds a structural snapshot with content file ids, match children, and domain keys', () => {
		const plugin = makePlugin(
			[
				match('a1', 'Notes/Alpha.md', 0, 'todo'),
				match('a2', 'Notes/Alpha.md', 4, 'todo'),
				match('b1', 'Notes/Beta.md', 2, 'todo'),
			],
			{ revision: 11 },
		);
		const explorer = new explorerContent(plugin) as SnapshotBackedContent;

		const snapshot = explorer.getSnapshot(new Set(['content:file:Notes/Alpha.md']));

		expect(snapshot.explorerId).toBe('content');
		expect(snapshot.providerKey).toBe('content');
		expect(snapshot.sourceRevisions).toEqual({ contentRevision: 11 });

		// Group (file) rows carry the content file id + filePath domain key.
		const fileRow = snapshot.byId.get('content:file:Notes/Alpha.md');
		expect(fileRow).toMatchObject({
			parentId: null,
			kind: 'file',
			path: 'Notes/Alpha.md',
			domainKey: 'Notes/Alpha.md',
			childrenIds: ['content:match:a1', 'content:match:a2'],
		});
		expect(snapshot.domainKeyToId.get('Notes/Alpha.md')).toBe('content:file:Notes/Alpha.md');

		// Expanded file reveals its match children in visible order.
		expect(snapshot.visibleIds).toEqual([
			'content:file:Notes/Alpha.md',
			'content:match:a1',
			'content:match:a2',
			'content:file:Notes/Beta.md',
		]);
	});

	it('keeps queue and active-filter revisions out of the structural snapshot (EDP-004)', () => {
		const plugin = makePlugin([match('a1', 'Notes/Alpha.md', 0, 'todo')], {
			revision: 3,
		});
		const explorer = new explorerContent(plugin) as SnapshotBackedContent;

		(plugin.operationsIndex as unknown as { nodes: unknown[]; revision: number }).nodes = [
			{ id: 'op-delete', group: 'file', change: { action: 'delete' } },
		];
		(plugin.operationsIndex as unknown as { revision: number }).revision = 99;
		(plugin.activeFiltersIndex as unknown as { revision: number }).revision = 42;

		const snapshot = explorer.getSnapshot(new Set());

		// Only the structural content revision flows through; queue/filter stay out.
		expect(snapshot.sourceRevisions).toEqual({ contentRevision: 3 });
		expect(snapshot.sourceRevisions).not.toHaveProperty('queueRevision');
		expect(snapshot.sourceRevisions).not.toHaveProperty('filterRevision');
	});

	it('reads the structural tree without invoking ViewService decorations', () => {
		const plugin = makePlugin([match('a1', 'Notes/Alpha.md', 0, 'todo')]);
		const explorer = new explorerContent(plugin) as SnapshotBackedContent;

		expect(explorer.getStructuralTree().map((node) => node.id)).toEqual([
			'content:file:Notes/Alpha.md',
		]);
		expect(plugin.viewService.getModel).not.toHaveBeenCalled();
	});
});
